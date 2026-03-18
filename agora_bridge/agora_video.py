import threading
import time
import logging
import av
import ctypes
from agora.rtc.agora_base import *
from agora.rtc.rtc_connection import RTCConnection
from agora.rtc.agora_service import AgoraService

logger = logging.getLogger(__name__)

_agora_service = None
def get_agora_service(app_id):
    global _agora_service
    if not _agora_service:
        config = AgoraServiceConfig()
        config.enable_video = 1
        config.enable_audio_device = 0
        config.enable_audio_processor = 0
        config.appid = app_id
        config.use_string_uid = 1
        
        _agora_service = AgoraService()
        _agora_service.initialize(config)
    return _agora_service

class AgoraVideoPublisher:
    def __init__(self, agora_service, rtc_config, stream_url, uid, token=""):
        """
        :param agora_service: AgoraService instance (already initialized)
        :param rtc_config: Dict with 'appId', 'channel'
        :param stream_url: RTSP URL (e.g., rtsp://10.21.31.103:8554/video1)
        :param uid: Agora UID for this camera (e.g., 'dd_m20_xlq_mac_front_cam')
        :param token: RTC Token (empty string if using APPID auth)
        """
        self.agora_service = agora_service
        self.rtc_config = rtc_config
        self.stream_url = stream_url
        self.uid = uid
        self.token = token
        
        self.connection = None
        self.running = False
        self.thread = None
        self.packet_count = 0
        
        # We will setup connection after probing the stream codec in the loop

    def _setup_connection(self, codec_type=2): # Default to VIDEO_CODEC_H264 (2)
        # 1. RTC Connection Config
        conn_config = RTCConnConfig(
            client_role_type=ClientRoleType.CLIENT_ROLE_BROADCASTER,
            channel_profile=ChannelProfileType.CHANNEL_PROFILE_LIVE_BROADCASTING,
            auto_subscribe_audio=0,
            auto_subscribe_video=0,
            enable_audio_recording_or_playout=0
        )
        
        # 2. Publish Config for Passthrough (Encoded Image)
        sender_options = SenderOptions(
            cc_mode=TCcMode.CC_ENABLED,
            codec_type=codec_type
        )
        publish_config = RtcConnectionPublishConfig(
            is_publish_audio=False,
            is_publish_video=True,
            video_publish_type=VideoPublishType.VIDEO_PUBLISH_TYPE_ENCODED_IMAGE,
            video_encoded_image_sender_options=sender_options
        )
        
        # 3. Create Connection
        self.connection = self.agora_service.create_rtc_connection(conn_config, publish_config)
        
        # 4. Connect to Channel
        ret = self.connection.connect(self.token, self.rtc_config["channel"], self.uid)
        if ret < 0:
            logger.error(f"[{self.uid}] Agora RTC connect failed: {ret}")
        else:
            logger.info(f"[{self.uid}] Connected to Agora RTC channel '{self.rtc_config['channel']}'")
            
        # 5. Publish Video Track
        self.connection.publish_video()

    def start(self):
        if self.running: return
        self.running = True
        self.thread = threading.Thread(target=self._stream_loop, daemon=True, name=f"VideoStream_{self.uid}")
        self.thread.start()
        logger.info(f"[{self.uid}] Started video publisher thread for {self.stream_url}")

    def stop(self):
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2.0)
            
        if self.connection:
            self.connection.unpublish_video()
            self.connection.disconnect()
            self.connection.release()
            self.connection = None
        logger.info(f"[{self.uid}] Stopped video publisher")

    def _stream_loop(self):
        # Retry loop for RTSP connection
        while self.running:
            try:
                logger.info(f"[{self.uid}] Attempting to open {self.stream_url} ...")
                # options to minimize latency and skip decoding
                options = {
                    'rtsp_transport': 'tcp', 
                    'fflags': 'nobuffer',
                    'flags': 'low_delay',
                    'analyzeduration': '1000000', # 1s
                    'probesize': '1000000' # 1MB
                }
                
                # Open the stream
                container = av.open(self.stream_url, options=options)
                video_stream = container.streams.video[0]
                
                # We do NOT want PyAV to decode frames, we just want packets.
                video_stream.thread_type = "NONE" # disable threading overhead for decoding since we aren't decoding
                
                try:
                    fps = float(video_stream.average_rate) if video_stream.average_rate else 0.0
                except:
                    fps = 0.0
                logger.info(f"[{self.uid}] Stream Info: codec={video_stream.codec_context.name}, res={video_stream.codec_context.width}x{video_stream.codec_context.height}, fps={fps}")
                
                if video_stream.codec_context.name != 'h264':
                    logger.warning(f"[{self.uid}] WARNING: Stream codec is {video_stream.codec_context.name}, but Agora publisher is set to H264. This may cause black frames on Web.")

                logger.info(f"[{self.uid}] Successfully opened {self.stream_url}")
                self.packet_count = 0
                
                # Detect actual codec
                codec_name = video_stream.codec_context.name
                do_transcoding = (codec_name != 'h264')
                
                if not do_transcoding:
                    detected_codec = VideoCodecType.VIDEO_CODEC_H264
                    logger.info(f"[{self.uid}] Detected H.264: Using Passthrough mode (0-CPU)")
                else:
                    detected_codec = VideoCodecType.VIDEO_CODEC_H264 # We transcode TO H.264 for Agora
                    logger.info(f"[{self.uid}] Detected {codec_name}: Using Transcoding mode (HEVC -> H.264)")
                    
                    # Setup Decoder
                    try:
                        decoder = video_stream.codec_context
                        # Setup Encoder (libx264)
                        encoder = av.codec.Codec('libx264', 'w').create()
                        encoder.width = video_stream.codec_context.width
                        encoder.height = video_stream.codec_context.height
                        encoder.pix_fmt = 'yuv420p' # Standard for H.264
                        encoder.time_base = video_stream.time_base
                        encoder.framerate = video_stream.average_rate or 30
                        # Real-time settings optimized for Agora
                        encoder.options = {
                            'preset': 'ultrafast',
                            'tune': 'zerolatency',
                            'crf': '23',
                            'g': '30',   # Keyframe every 1 second
                            'x264-params': 'annexb=1:repeat-headers=1' # Crucial for resolution detection/billing
                        }
                        encoder.open()
                    except Exception as e:
                        logger.error(f"[{self.uid}] Failed to setup transcoder: {e}")
                        do_transcoding = False # Fallback to passthrough (will likely be black)

                # Initialize Agora connection with H.264 (since we want the Web to see H.264)
                if not self.connection:
                    self._setup_connection(VideoCodecType.VIDEO_CODEC_H264)
                
                # Demux loop
                for packet in container.demux(video_stream):
                    if not self.running: break
                    
                    if packet.dts is None:
                        continue
                        
                    # 1. Handle Transcoding vs Passthrough
                    out_packets = []
                    if do_transcoding:
                        # Decode packet to frames
                        try:
                            frames = packet.decode()
                            for frame in frames:
                                # Encode frame to H.264 packets
                                eps = encoder.encode(frame)
                                out_packets.extend(eps)
                        except Exception as e:
                            logger.error(f"[{self.uid}] Transcode error at decode/encode: {e}")
                            continue
                    else:
                        # Passthrough
                        out_packets = [packet]

                    # 2. Push packets to Agora
                    for out_packet in out_packets:
                        raw_data = bytes(out_packet)
                        if not raw_data: continue
                        
                        frame_info = EncodedVideoFrameInfo(
                            codec_type=VideoCodecType.VIDEO_CODEC_H264,
                            width=video_stream.codec_context.width or 1280,
                            height=video_stream.codec_context.height or 720,
                            frames_per_second=int(video_stream.average_rate or 30),
                            frame_type= 3 if out_packet.is_keyframe else 4, 
                            rotation=0,
                            track_id=0,
                            uid=0,
                            stream_type=0,
                            capture_time_ms=int(time.time() * 1000)
                        )
                        
                        if self.packet_count < 10:
                            logger.info(f"[{self.uid}] Packet {self.packet_count}: size={len(raw_data)}, key={out_packet.is_keyframe}, pts={out_packet.pts}, codec={'transcoded-h264' if do_transcoding else codec_name}")
                        
                        if self.connection:
                            self.connection.push_video_encoded_data(raw_data, frame_info)
                            self.packet_count += 1
                            if self.packet_count % 100 == 0:
                                logger.info(f"[{self.uid}] Pushed {self.packet_count} packets. Last was {'KeyFrame' if out_packet.is_keyframe else 'DeltaFrame'}")
                        
            except av.AVError as e:
                # Normal if stream ends or closes
                logger.warning(f"[{self.uid}] PyAV Error: {e}")
            except Exception as e:
                logger.error(f"[{self.uid}] Stream error: {e}")
                
            if self.running:
                logger.info(f"[{self.uid}] Reconnecting in 3s...")
                time.sleep(3)
