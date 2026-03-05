
---
## 第 1 页
---

 
山猫M20 软件接口手册(beta) 
V0.1.0 2025.09.16 
 
 
 
 


---
## 第 2 页
---

DEEP Robotics 
 2 / 57 
文档说明 
版本号 
修改时间 
修改内容 
0.0.0 
2025/6/7 
新建文档 
0.0.1 
2025/6/21 
更新本体监控协议内容 
0.0.2 
2025/6/23 
更新对外发布版 
0.0.3 
2025/7/4 
修改使用模式切换请求的Type 和Command 值； 
修改步态切换请求的基础步态值； 
修改轴指令在基础和楼梯步态下的生效参数值； 
删除设备使能请求； 
更新运控状态上报的频率值； 
更新设备状态上报结构； 
更新基础状态上报结构； 
删除异常状态请求； 
修改协议头部同步字符。 
0.0.4 
2025/7/10 
更新机器人充电状态返回值 
0.0.5 
2025/7/15 
更新运动控制（轴指令）消息集的值 
0.0.6 
2025/8/4 
更新巡检类ASDU 消息集 
0.0.7 
2025/8/8 
更新“运动控制”章节中机器人运动正方向说明 
0.0.8 
2025/8/11 
更新部分ASDU 格式 
0.0.9 
2025/8/21 
增加运动主机DDS 话题 
0.1.0 
2025/9/16 
更新整机DDS 话题 
※最终解释权归杭州云深处科技所有 


|  |  |  |
| --- | --- | --- |
| 版本号 | 修改时间 | 修改内容 |
|  |  |  |
| 0.0.0 | 2025/6/7 | 新建文档 |
| 0.0.1 | 2025/6/21 | 更新本体监控协议内容 |
| 0.0.2 | 2025/6/23 | 更新对外发布版 |
| 0.0.3 | 2025/7/4 | 修改使用模式切换请求的Type 和Command 值；
修改步态切换请求的基础步态值；
修改轴指令在基础和楼梯步态下的生效参数值；
删除设备使能请求；
更新运控状态上报的频率值；
更新设备状态上报结构；
更新基础状态上报结构；
删除异常状态请求；
修改协议头部同步字符。 |
| 0.0.4 | 2025/7/10 | 更新机器人充电状态返回值 |
| 0.0.5 | 2025/7/15 | 更新运动控制（轴指令）消息集的值 |
| 0.0.6 | 2025/8/4 | 更新巡检类ASDU 消息集 |
| 0.0.7 | 2025/8/8 | 更新“运动控制”章节中机器人运动正方向说明 |
| 0.0.8 | 2025/8/11 | 更新部分ASDU 格式 |
| 0.0.9 | 2025/8/21 | 增加运动主机DDS 话题 |
| 0.1.0 | 2025/9/16 | 更新整机DDS 话题 |


---
## 第 3 页
---

DEEP Robotics 
 3 / 57 
目录 
1 本体监控协议 ............................................................................................ 6 
1.1 协议总则 ........................................................................................................................ 6 
1.1.1 协议层次 ................................................................................................................................... 6 
1.1.2 协议端口号 ............................................................................................................................... 6 
1.1.3 交互机制 ................................................................................................................................... 6 
1.1.4 应用协议数据单元 .................................................................................................................... 6 
1.1.5 协议头部结构 ........................................................................................................................... 7 
1.1.6 ASDU 结构 ............................................................................................................................... 7 
1.2 控制类ASDU 消息集 ..................................................................................................... 8 
1.2.1 心跳指令 ................................................................................................................................... 8 
1.2.2 使用模式切换 ........................................................................................................................... 9 
1.2.3 运动状态转换 ......................................................................................................................... 10 
1.2.4 步态切换 ................................................................................................................................. 11 
1.2.5 运动控制（轴指令） .............................................................................................................. 12 
1.2.6 照明灯 .................................................................................................................................... 14 
1.3 状态类ASDU 消息集 ................................................................................................... 15 
1.3.1 获取实时状态 ......................................................................................................................... 15 
1.3.2 获取异常状态信息 .................................................................................................................. 27 
1.3.3 休眠状态及设置信息查询 ....................................................................................................... 30 
1.4 巡检类ASDU 消息集 ................................................................................................... 31 
1.4.1 初始化和重置定位 .................................................................................................................. 31 


---
## 第 4 页
---

DEEP Robotics 
 4 / 57 
1.4.2 获取地图坐标系下的位置信息 ............................................................................................... 34 
1.4.3 获取导航中的感知软件状态信息 ........................................................................................... 35 
1.4.4 下发单点导航任务 .................................................................................................................. 37 
1.4.5 取消导航任务 ......................................................................................................................... 42 
1.4.6 查询导航任务执行状态 .......................................................................................................... 43 
2 DDS 话题 ................................................................................................. 46 
2.1 传感器驱动话题 ........................................................................................................... 46 
2.2 高度图相关话题 ........................................................................................................... 46 
2.2.1 获取障碍物点云 ..................................................................................................................... 46 
2.2.2 获取环视深度图 ..................................................................................................................... 46 
2.3 运动相关话题 .............................................................................................................. 47 
2.3.1 运动状态转换 ......................................................................................................................... 47 
2.3.2 运控步态切换 ......................................................................................................................... 48 
2.3.3 获取运动基本状态和步态 ....................................................................................................... 48 
2.4 运动相关话题 .............................................................................................................. 50 
2.4.1 下发自主充电指令 .................................................................................................................. 50 
2.4.2 获取自主充电状态 .................................................................................................................. 50 
2.5 速度相关话题 .............................................................................................................. 51 
2.5.1 获取或下发导航速度指令 ....................................................................................................... 51 
附录1 UDP 示例代码 .................................................................................. 54 
附录2 机器人服务状态查询与管理方法 ....................................................... 56 
附录3 相机视频流获取 ............................................................................... 57 


---
## 第 5 页
---

DEEP Robotics 
 5 / 57 
 


---
## 第 6 页
---

DEEP Robotics 
 6 / 57 
1 本体监控协议 
1.1 协议总则 
本协议基于TCP 或UDP 协议（根据具体开发需要进行选择），适用于机器人本体与上位机（
外部板卡或系统）通信使用。 
1.1.1 协议层次 
本协议在OSI 七层体系中所属位置以及协议栈数据结构，如下表所示： 
本协议 
应用层（第7层） 
TCP/IP协议或UDP/IP协议 
传输层（第4层） 
网络层（第3层） 
以太网 
链路层（第2层） 
物理层（第1层） 
注： 第5，第6层未用 
1.1.2 协议端口号 
本协议使用时，机器人本体为TCP/UDP 服务端，外部板卡或系统为TCP/UDP 客户端。协议
的UDP 服务端地址与端口为10.21.31.103:30000，TCP 服务端为10.21.31.103:30001。 
1.1.3 交互机制 
如下图所示，本协议主要使用请求/响应机制。上位机可主动向机器人本体发起数据或状态查
询请求，机器人本体通过响应回复部分请求。 
 
1.1.4 应用协议数据单元 
本协议APDU（应用协议数据单元）采用“协议头部+ASDU（应用服务数据单元）”结构，


| 本协议 | 应用层（第7层） |
| --- | --- |
| TCP/IP协议或UDP/IP协议 | 传输层（第4层） |
|  | 网络层（第3层） |
| 以太网 | 链路层（第2层） |
|  | 物理层（第1层） |
| 注： 第5，第6层未用 |  |


---
## 第 7 页
---

DEEP Robotics 
 7 / 57 
每个APDU 可以携带1 个ASDU。 
 
1.1.5 协议头部结构 
协议头部长度固定16 字节，内容如下表所示。 
序号 
内容 
长度 
值 
备注 
1 
同步字符 
1 
0xeb 
固定 
2 
同步字符 
1 
0x91 
固定 
3 
同步字符 
1 
0xeb 
固定 
4 
同步字符 
1 
0x90 
固定 
5 
长度 
2 
 
APDU中ASDU字节段的长度，采用小端字节序，低字节在前，ASDU
最大长度限制为65535字节 
6 
报文ID 
2 
 
每帧报文的唯一标识，用于识别请求帧和响应帧的对应关系，值由请
求方控制，响应帧将采用相同值回复； 
从0开始递增，达到65535后重新从0开始； 
采用小端字节序，低字节在前 
7 
ASDU 格式 
1 
 
ASDU数据格式类型判断位； 
ASDU数据内容采用XML格式时，值为 0x00； 
ASDU数据内容采用JSON格式时，值为 0x01 
8 
预留 
7 
0x00 
预留7字节，暂填0 
1.1.6 ASDU 结构 
本协议ASDU 数据内容采用JSON 或XML 格式组织（参考1.1.5 节需在协议头部中写明），
包含以下通用字段： 
字段 
含义 
Type 
消息类型 
Command 
消息命令码 
Time 
报文发送时间，本地时区，格式：YYYY-MM-DD HH:MM:SS 
Items 
消息所携带的参数项 
 
协议头部
数据
APDU
ASDU


| 协议头部 | 数据 |
| --- | --- |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 序号 | 内容 | 长度 | 值 | 备注 |
|  |  |  |  |  |
| 1 | 同步字符 | 1 | 0xeb | 固定 |
| 2 | 同步字符 | 1 | 0x91 | 固定 |
| 3 | 同步字符 | 1 | 0xeb | 固定 |
| 4 | 同步字符 | 1 | 0x90 | 固定 |
| 5 | 长度 | 2 |  | APDU中ASDU字节段的长度，采用小端字节序，低字节在前，ASDU
最大长度限制为65535字节 |
| 6 | 报文ID | 2 |  | 每帧报文的唯一标识，用于识别请求帧和响应帧的对应关系，值由请
求方控制，响应帧将采用相同值回复；
从0开始递增，达到65535后重新从0开始；
采用小端字节序，低字节在前 |
| 7 | ASDU 格式 | 1 |  | ASDU数据格式类型判断位；
ASDU数据内容采用XML格式时，值为 0x00；
ASDU数据内容采用JSON格式时，值为 0x01 |
| 8 | 预留 | 7 | 0x00 | 预留7字节，暂填0 |


|  |  |
| --- | --- |
| 字段 | 含义 |
|  |  |
| Type | 消息类型 |
| Command | 消息命令码 |
| Time | 报文发送时间，本地时区，格式：YYYY-MM-DD HH:MM:SS |
| Items | 消息所携带的参数项 |


---
## 第 8 页
---

DEEP Robotics 
 8 / 57 
【注意】推荐使用JSON 格式，JSON 格式下ASDU 处理性能更快且数据结构更全面，支持更
多消息类型。 
一个JSON 的ASDU 案例如下： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1002, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
} 
 
} 
} 
一个XML 的ASDU 案例如下： 
1 
2 
3 
4 
5 
6 
7 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1002</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items/>   
</PatrolDevice> 
1.2 控制类ASDU 消息集 
1.2.1 心跳指令 
用户可通过该请求向机器人发送心跳指令。 
Type字段值 
Command字段值 
消息类型 
100 
100 
心跳指令 
 
【注意】建议以不小于1Hz 的频率发送该指令，机器人会向持续发送心跳指令的IP 和端口
上报实时状态信息和异常状态信息，详见1.3 部分。 
JSON 格式请求： 
1 
2 
3 
4 
{ 
 
"PatrolDevice": { 
 
 
"Type": 100, 
 
 
"Command": 100, 


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1002, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1002</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items/> |
| 7 | </PatrolDevice> |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 100 | 100 | 心跳指令 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 100, |
| 4 | "Command": 100, |


---
## 第 9 页
---

DEEP Robotics 
 9 / 57 
5 
6 
7 
8 
9 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>100</Type> 
 
<Command>100</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items/> 
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
1.2.2 使用模式切换 
用户可通过该请求切换机器人使用模式，并参考1.3 节中的反馈信息判断是否执行成功。 
Type字段值 
Command字段值 
消息类型 
1101 
5 
使用模式切换 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1101, 
 
 
"Command": 5, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
             "Mode": 0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1101</Type> 
 
<Command>5</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<Mode>0</Mode> 


| 5 | "Time": "2023-01-01 00:00:00", |
| --- | --- |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>100</Type> |
| 4 | <Command>100</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items/> |
| 7 | </PatrolDevice> |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1101 | 5 | 使用模式切换 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1101, |
| 4 | "Command": 5, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Mode": 0 |
| 8 | } |
| 9 | } |
| 10 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1101</Type> |
| 4 | <Command>5</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <Mode>0</Mode> |


---
## 第 10 页
---

DEEP Robotics 
 10 / 57 
8 
9 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 单位 
参数值说明 
Mode 
机器人使用模式 
int 
/ 
常规模式=0 
导航模式=1 
辅助模式=2 
 
【注意】常规模式下支持执行轴指令（见1.2.5 节），导航模式下支持执行导航任务。 
1.2.3 运动状态转换 
用户可通过该请求转换机器人运动状态，并参考1.3 节中的反馈信息判断是否执行成功。 
Type字段值 
Command字段值 
消息类型 
2 
22 
运动状态转换 
 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2, 
 
 
"Command": 22, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
             "MotionParam": 0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>2</Type> 
 
<Command>22</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<MotionParam>0</MotionParam> 
 
</Items> 
</PatrolDevice> 


| 8 | </Items> |
| --- | --- |
| 9 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Mode | 机器人使用模式 | int | / | 常规模式=0
导航模式=1
辅助模式=2 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 2 | 22 | 运动状态转换 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2, |
| 4 | "Command": 22, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "MotionParam": 0 |
| 8 | } |
| 9 | } |
| 10 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2</Type> |
| 4 | <Command>22</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <MotionParam>0</MotionParam> |
| 8 | </Items> |
| 9 | </PatrolDevice> |


---
## 第 11 页
---

DEEP Robotics 
 11 / 57 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 单位 
参数值说明 
MotionParam 
机器人运动状态[1] 
int 
/ 
空闲=0 
站立=1 
关节阻尼/软急停=2 
开机阻尼=3 
趴下=4 
标准运动模式=6 
[1]机器人运动模式转换关系如下图所示： 
 
【注意】RL 控制状态下，分为标准运动模式和敏捷运动模式：标准运动模式适用于手动控
制；敏捷运动模式下的步态速度响应性能较好，适用于导航等自主算法开发。 
1.2.4 步态切换 
用户可通过该请求切换机器人使用的步态，并参考1.3 节中的反馈信息判断是否执行成功。 
Type字段值 
Command字段值 
消息类型 
2 
23 
步态切换 
 
JSON 格式请求： 
1 
2 
3 
4 
5 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2, 
 
 
"Command": 23, 
 
 
"Time": "2023-01-01 00:00:00", 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| MotionParam | 机器人运动状态[1] | int | / | 空闲=0
站立=1
关节阻尼/软急停=2
开机阻尼=3
趴下=4
标准运动模式=6 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 2 | 23 | 步态切换 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2, |
| 4 | "Command": 23, |
| 5 | "Time": "2023-01-01 00:00:00", |


---
## 第 12 页
---

DEEP Robotics 
 12 / 57 
6 
7 
8 
9 
10 
 
 
"Items": { 
             "GaitParam": 0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>2</Type> 
 
<Command>23</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<GaitParam>0</GaitParam> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 
单位 
参数值说明 
GaitParam 
机器人运动步态 
int 
/ 
基础（标准运动模式）=1 
平地（敏捷运动模式）=12 
楼梯（敏捷运动模式）=13 
楼梯（标准运动模式）=14 
 
【注意】不同运动模式下支持不同的步态，步态切换时会自动切换到对应的运动模式；运
动模式切换时，也会自动切换到对应的默认步态，运动模式请参考1.2.3 节。 
1.2.5 运动控制（轴指令） 
用户可通过该请求控制机器人运动。 
Type字段值 
Command字段值 
消息类型 
2 
21 
运动控制 
 
【注意】该指令仅支持在常规模式下执行。 
JSON 格式请求： 
1 
2 
3 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2, 


| 6 | "Items": { |
| --- | --- |
| 7 | "GaitParam": 0 |
| 8 | } |
| 9 | } |
| 10 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2</Type> |
| 4 | <Command>23</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <GaitParam>0</GaitParam> |
| 8 | </Items> |
| 9 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| GaitParam | 机器人运动步态 | int | / | 基础（标准运动模式）=1
平地（敏捷运动模式）=12
楼梯（敏捷运动模式）=13
楼梯（标准运动模式）=14 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 2 | 21 | 运动控制 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2, |


---
## 第 13 页
---

DEEP Robotics 
 13 / 57 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
 
 
"Command": 21, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
             "X": 0.0, 
             "Y": 0.0, 
             "Z": 0.0, 
             "Roll": 0.0, 
             "Pitch": 0.0, 
             "Yaw": 0.0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>2</Type> 
 
<Command>21</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<X>0.0</X> 
 
 
<Y>0.0</Y> 
 
 
<Z>0.0</Z> 
 
 
<Roll>0.0</Roll> 
 
 
<Pitch>0.0</Pitch> 
 
 
<Yaw>0.0</Yaw> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 
单位 
参数值说明 
X 
前后方向运动速度 
float 
/ 
[-1,1]([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度前进、后退)
Y 
左右方向运动速度 
float 
/ 
[-1,1]([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度左移、右移)
Z 
高度方向运动速度 
float 
/ 
[-1,1]([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度向上、向下运动)
Roll 
翻滚角 
float 
/ 
[-1,1] ([-1,1]之间的值表示当前指令速度相对于最大速度的
比例,参数值的正负方向请参考右手坐标系确定)
Pitch 
俯仰角 
float 
/ 
[-1,1]([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 参数值的正负方向请参考右手坐标系确定)
Yaw 
偏航角 
float 
/ 
[-1,1]([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 参数值的正负方向请参考右手坐标系确定)
机器人的移动、旋转正方向请参考下图： 


| 4 | "Command": 21, |
| --- | --- |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "X": 0.0, |
| 8 | "Y": 0.0, |
| 9 | "Z": 0.0, |
| 10 | "Roll": 0.0, |
| 11 | "Pitch": 0.0, |
| 12 | "Yaw": 0.0 |
| 13 | } |
| 14 | } |
| 15 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2</Type> |
| 4 | <Command>21</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <X>0.0</X> |
| 8 | <Y>0.0</Y> |
| 9 | <Z>0.0</Z> |
| 10 | <Roll>0.0</Roll> |
| 11 | <Pitch>0.0</Pitch> |
| 12 | <Yaw>0.0</Yaw> |
| 13 | </Items> |
| 14 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| X | 前后方向运动速度 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度前进、后退) |
| Y | 左右方向运动速度 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度左移、右移) |
| Z | 高度方向运动速度 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 1、-1表示以最大速度向上、向下运动) |
| Roll | 翻滚角 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例,参数值的正负方向请参考右手坐标系确定) |
| Pitch | 俯仰角 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 参数值的正负方向请参考右手坐标系确定) |
| Yaw | 偏航角 | float | / | [-1,1]
([-1,1]之间的值表示当前指令速度相对于最大速度的
比例, 参数值的正负方向请参考右手坐标系确定) |


---
## 第 14 页
---

DEEP Robotics 
 14 / 57 
 
【注意】建议控制机器人平移或旋转的请求消息发送频率为20Hz。基础或楼梯步态仅有参
数项X、Y、Yaw 生效。 
1.2.6 照明灯 
用户可通过该请求开启/关闭机器人前/后侧照明灯，并参考1.3 节中的反馈信息判断是否执行
成功。 
Type字段值 
Command字段值 
消息类型 
1101 
2 
照明灯 
 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1101, 
 
 
"Command": 2, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
             "Front": 0, 
             "Back": 0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1101</Type> 


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1101 | 2 | 照明灯 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1101, |
| 4 | "Command": 2, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Front": 0, |
| 8 | "Back": 0 |
| 9 | } |
| 10 | } |
| 11 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1101</Type> |


---
## 第 15 页
---

DEEP Robotics 
 15 / 57 
4 
5 
6 
7 
8 
9 
10 
 
<Command>2</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<Front>0</Front> 
 
 
<Back>0</Back> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 单位 
参数值说明 
Front 
机器人前侧照明灯 
int 
/ 
关闭照明灯=0 
开启照明灯=1 
Back 
机器人后侧照明灯 
1.3 状态类ASDU 消息集 
1.3.1 获取实时状态 
机器人会向发送心跳指令（参考1.2.1）的IP 地址和端口主动上报状态信息。 
1.3.1.1 基础状态上报 
该消息集以2Hz 的频率主动上报，用户可通过该上报获取机器人当前的基础状态信息。 
Type字段值 
Command字段值 
消息类型 
1002 
6 
获取机器人基础状态信息 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1002, 
 
 
"Command": 6, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"BasicStatus": { 
 
 
 
 
"MotionState": 0, 
 
 
 
 
"Gait": 0, 
 
 
 
 
"Charge":0, 
 
 
 
 
"HES"：0, 
 
 
 
 
"ControlUsageMode"：0, 
 
 
 
 
"Direction"：0, 
 
 
 
 
"OOA"：0, 


| 4 | <Command>2</Command> |
| --- | --- |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <Front>0</Front> |
| 8 | <Back>0</Back> |
| 9 | </Items> |
| 10 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Front | 机器人前侧照明灯 | int | / | 关闭照明灯=0
开启照明灯=1 |
| Back | 机器人后侧照明灯 |  |  |  |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1002 | 6 | 获取机器人基础状态信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1002, |
| 4 | "Command": 6, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "BasicStatus": { |
| 8 | "MotionState": 0, |
| 9 | "Gait": 0, |
| 10 | "Charge":0, |
| 11 | "HES"：0, |
| 12 | "ControlUsageMode"：0, |
| 13 | "Direction"：0, |
| 14 | "OOA"：0, |


---
## 第 16 页
---

DEEP Robotics 
 16 / 57 
15 
16 
17 
18 
19 
20 
21 
 
 
 
 
"PowerManagement"：0, 
 
 
 
 
"Sleep"：false, 
 
 
 
 
"Version"：STD 
 
 
} 
 
 
} 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1002</Type> 
 
<Command>6</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<BasicStatus> 
 
 
 
<MotionState>0</MotionState> 
 
 
 
<Gait>0</Gait> 
 
 
 
<Charge>0</Charge> 
 
 
 
<HES>0</HES> 
 
 
 
<ControlUsageMode>0</ControlUsageMode> 
 
 
 
<Direction>0</Direction> 
 
 
 
<OOA>0</OOA> 
 
 
 
<PowerManagement>0</PowerManagement> 
 
 
 
<Sleep>false</Sleep> 
 
 
 
<Version>STD</Version> 
 
 
</BasicStatus> 
 
</Items> 
</PatrolDevice> 
Items 字段中的部分参数项含义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
MotionState 
机器人运动状态[1] 
int 
/ 
空闲=0 
站立=1 
关节阻尼/软急停=2 
开机阻尼=3 
趴下=4 
标准运动模式=6 
敏捷运动模式=8 
Gait 
机器人步态 
int 
/ 
基础（标准运动模式）=1 
高台（标准运动模式）=2 


| 15 | "PowerManagement"：0, |
| --- | --- |
| 16 | "Sleep"：false, |
| 17 | "Version"：STD |
| 18 | } |
| 19 | } |
| 20 | } |
| 21 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1002</Type> |
| 4 | <Command>6</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <BasicStatus> |
| 8 | <MotionState>0</MotionState> |
| 9 | <Gait>0</Gait> |
| 10 | <Charge>0</Charge> |
| 11 | <HES>0</HES> |
| 12 | <ControlUsageMode>0</ControlUsageMode> |
| 13 | <Direction>0</Direction> |
| 14 | <OOA>0</OOA> |
| 15 | <PowerManagement>0</PowerManagement> |
| 16 | <Sleep>false</Sleep> |
| 17 | <Version>STD</Version> |
| 18 | </BasicStatus> |
| 19 | </Items> |
| 20 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| MotionState | 机器人运动状态[1] | int | / | 空闲=0
站立=1
关节阻尼/软急停=2
开机阻尼=3
趴下=4
标准运动模式=6
敏捷运动模式=8 |
| Gait | 机器人步态 | int | / | 基础（标准运动模式）=1
高台（标准运动模式）=2 |


---
## 第 17 页
---

DEEP Robotics 
 17 / 57 
参数项 
含义 
数据类型 单位 
参数值说明 
平地（敏捷运动模式）=12 
楼梯（敏捷运动模式）=13 
楼梯（标准运动模式）=14 
Charge 
机器人充电状态 
int 
/ 
空闲=0 
前往充电桩过程中=1 
充电中=2 
退出充电桩过程中=3 
机器人异常=4 
机器人在桩上，但未充电=5 
HES 
Hard emergency stop，硬急停状态 
int 
/ 
未触发=0，已触发=1 
ControlUsageMode 
机器人的使用模式 
int 
/ 
常规模式=0 
导航模式=1 
辅助模式=2 
Direction 
机器人前进正方向[2] 
int 
/ 
正向为前进正方向=0 
后向为前进正方向=1 
OOA 
辅助模式避障状态 
int 
/ 
未启动 = 0   
空闲中 = 1 
未触发避障 = 2   
主动避障中 = 3 
PowerManagement 
电源管理模式 
int 
/ 
常规模式 = 0 
单电池模式 = 1 
Sleep 
休眠状态 
bool 
/ 
已休眠 = true 
未休眠 = false 
Version 
设备版本 
/ 
/ 
山猫M20 = STD 
山猫M20 Pro = PRO 
[2] 机器人的前进正方向指下发X 轴速度值为正值时，机器人的移动方向。前进正方向为后向
时，机器人视硬急停的一侧为前进正方向。 
1.3.1.2 运控状态上报 
该消息类型以10Hz 的频率主动上报，用户可通过该消息类型的上报获取机器人当前的运动控
制状态信息。 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
|  |  |  |  | 平地（敏捷运动模式）=12
楼梯（敏捷运动模式）=13
楼梯（标准运动模式）=14 |
| Charge | 机器人充电状态 | int | / | 空闲=0
前往充电桩过程中=1
充电中=2
退出充电桩过程中=3
机器人异常=4
机器人在桩上，但未充电=5 |
| HES | Hard emergency stop，硬急停状态 | int | / | 未触发=0，已触发=1 |
| ControlUsageMode | 机器人的使用模式 | int | / | 常规模式=0
导航模式=1
辅助模式=2 |
| Direction | 机器人前进正方向[2] | int | / | 正向为前进正方向=0
后向为前进正方向=1 |
| OOA | 辅助模式避障状态 | int | / | 未启动 = 0
空闲中 = 1
未触发避障 = 2
主动避障中 = 3 |
| PowerManagement | 电源管理模式 | int | / | 常规模式 = 0
单电池模式 = 1 |
| Sleep | 休眠状态 | bool | / | 已休眠 = true
未休眠 = false |
| Version | 设备版本 | / | / | 山猫M20 = STD
山猫M20 Pro = PRO |


---
## 第 18 页
---

DEEP Robotics 
 18 / 57 
Type字段值 
Command字段值 
消息类型 
1002 
4 
获取机器人运控状态信息 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
22 
23 
24 
25 
26 
27 
28 
29 
30 
31 
32 
33 
34 
35 
36 
37 
38 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1002, 
 
 
"Command": 4, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"MotionStatus": { 
 
 
 
 
"Roll": 0.0, 
 
 
 
 
"Pitch": 0.0, 
 
 
 
 
"Yaw": 0.0, 
 
 
 
 
"OmegaZ": 0.0, 
 
 
 
 
"LinearX": 0.0, 
 
 
 
 
"LinearY": 0.0, 
 
 
 
 
"Height": 0.0, 
 
 
 
 
"Payload":0.0, 
 
 
 
 
"RemainMile":0.0 
 
 
 
}, 
 
 
 
"MotorStatus": { 
 
 
 
 
"LeftFrontHipX": 0.0, 
 
 
 
 
"LeftFrontHipY": 0.0, 
 
 
 
 
"LeftFrontKnee": 0.0, 
 
 
 
 
"LeftFrontWheel": 0.0, 
 
 
 
 
"RightFrontHipX": 0.0, 
 
 
 
 
"RightFrontHipY": 0.0, 
 
 
 
 
"RightFrontKnee": 0.0, 
 
 
 
 
"RightFrontWheel": 0.0, 
 
 
 
 
"LeftBackHipX": 0.0, 
 
 
 
 
"LeftBackHipY": 0.0, 
 
 
 
 
"LeftBackKnee": 0.0, 
 
 
 
 
"LeftBackWheel": 0.0, 
 
 
 
 
"RightBackHipX": 0.0, 
 
 
 
 
"RightBackHipY": 0.0, 
 
 
 
 
"RightBackKnee": 0.0, 
 
 
 
 
"RightBackWheel": 0.0 
            } 
 
 
} 
} 
} 
XML 格式响应： 


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1002 | 4 | 获取机器人运控状态信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1002, |
| 4 | "Command": 4, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "MotionStatus": { |
| 8 | "Roll": 0.0, |
| 9 | "Pitch": 0.0, |
| 10 | "Yaw": 0.0, |
| 11 | "OmegaZ": 0.0, |
| 12 | "LinearX": 0.0, |
| 13 | "LinearY": 0.0, |
| 14 | "Height": 0.0, |
| 15 | "Payload":0.0, |
| 16 | "RemainMile":0.0 |
| 17 | }, |
| 18 | "MotorStatus": { |
| 19 | "LeftFrontHipX": 0.0, |
| 20 | "LeftFrontHipY": 0.0, |
| 21 | "LeftFrontKnee": 0.0, |
| 22 | "LeftFrontWheel": 0.0, |
| 23 | "RightFrontHipX": 0.0, |
| 24 | "RightFrontHipY": 0.0, |
| 25 | "RightFrontKnee": 0.0, |
| 26 | "RightFrontWheel": 0.0, |
| 27 | "LeftBackHipX": 0.0, |
| 28 | "LeftBackHipY": 0.0, |
| 29 | "LeftBackKnee": 0.0, |
| 30 | "LeftBackWheel": 0.0, |
| 31 | "RightBackHipX": 0.0, |
| 32 | "RightBackHipY": 0.0, |
| 33 | "RightBackKnee": 0.0, |
| 34 | "RightBackWheel": 0.0 |
| 35 | } |
| 36 | } |
| 37 | } |
| 38 | } |


---
## 第 19 页
---

DEEP Robotics 
 19 / 57 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
22 
23 
24 
25 
26 
27 
28 
29 
30 
31 
32 
33 
34 
35 
36 
37 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1002</Type> 
 
<Command>4</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<MotionStatus> 
 
 
 
<Roll>0.0</Roll> 
 
 
 
<Pitch>0.0</Pitch> 
 
 
 
<Yaw>0.0</Yaw>   
 
 
 
<OmegaZ>0.0</OmegaZ> 
 
 
 
<LinearX>0.0</LinearX> 
 
 
 
<LinearY>0.0</LinearY> 
 
 
 
<Height>0.0</Height> 
 
 
 
<Payload>0.0</Payload> 
 
 
 
<RemainMile>0.0</RemainMile> 
 
 
</MotionStatus> 
 
 
<MotorStatus> 
 
 
 
<LeftFrontHipX>0.0</LeftFrontHipX> 
 
 
 
<LeftFrontHipY>0.0</LeftFrontHipY> 
 
 
 
<LeftFrontKnee>0.0</LeftFrontKnee> 
 
 
 
<LeftFrontWheel>0.0</LeftFrontWheel> 
 
 
 
<RightFrontHipX>0.0</RightFrontHipX> 
 
 
 
<RightFrontHipY>0.0</RightFrontHipY> 
 
 
 
<RightFrontKnee>0.0</RightFrontKnee> 
 
 
 
<RightFrontWheel>0.0</RightFrontWheel> 
 
 
 
<LeftBackHipX>0.0</LeftBackHipX> 
 
 
 
<LeftBackHipY>0.0</LeftBackHipY> 
 
 
 
<LeftBackKnee>0.0</LeftBackKnee> 
 
 
 
<LeftBackWheel>0.0</LeftBackWheel> 
 
 
 
<RightBackHipX>0.0</RightBackHipX> 
 
 
 
<RightBackHipY>0.0</RightBackHipY> 
 
 
 
<RightBackKnee>0.0</RightBackKnee> 
 
 
 
<RightBackWheel>0.0</RightBackWheel> 
 
 
</MotorStatus> 
 
</Items> 
</PatrolDevice> 
该响应消息中，Items 字段包含MotionStatus 和MotorStatus 两组参数。 
MotionStatus 参数组反馈机器人整机的运动状态信息： 
参数项 
含义 
数据类型 
单位 
Roll/Pitch/Yaw 
机器人的姿态角度 
float 
rad 


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1002</Type> |
| 4 | <Command>4</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <MotionStatus> |
| 8 | <Roll>0.0</Roll> |
| 9 | <Pitch>0.0</Pitch> |
| 10 | <Yaw>0.0</Yaw> |
| 11 | <OmegaZ>0.0</OmegaZ> |
| 12 | <LinearX>0.0</LinearX> |
| 13 | <LinearY>0.0</LinearY> |
| 14 | <Height>0.0</Height> |
| 15 | <Payload>0.0</Payload> |
| 16 | <RemainMile>0.0</RemainMile> |
| 17 | </MotionStatus> |
| 18 | <MotorStatus> |
| 19 | <LeftFrontHipX>0.0</LeftFrontHipX> |
| 20 | <LeftFrontHipY>0.0</LeftFrontHipY> |
| 21 | <LeftFrontKnee>0.0</LeftFrontKnee> |
| 22 | <LeftFrontWheel>0.0</LeftFrontWheel> |
| 23 | <RightFrontHipX>0.0</RightFrontHipX> |
| 24 | <RightFrontHipY>0.0</RightFrontHipY> |
| 25 | <RightFrontKnee>0.0</RightFrontKnee> |
| 26 | <RightFrontWheel>0.0</RightFrontWheel> |
| 27 | <LeftBackHipX>0.0</LeftBackHipX> |
| 28 | <LeftBackHipY>0.0</LeftBackHipY> |
| 29 | <LeftBackKnee>0.0</LeftBackKnee> |
| 30 | <LeftBackWheel>0.0</LeftBackWheel> |
| 31 | <RightBackHipX>0.0</RightBackHipX> |
| 32 | <RightBackHipY>0.0</RightBackHipY> |
| 33 | <RightBackKnee>0.0</RightBackKnee> |
| 34 | <RightBackWheel>0.0</RightBackWheel> |
| 35 | </MotorStatus> |
| 36 | </Items> |
| 37 | </PatrolDevice> |


|  |  |  |  |
| --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 |
|  |  |  |  |
| Roll/Pitch/Yaw | 机器人的姿态角度 | float | rad |


---
## 第 20 页
---

DEEP Robotics 
 20 / 57 
参数项 
含义 
数据类型 
单位 
OmegaZ 
Z方向角速度 
float 
rad/s 
LinearX / LinearY 
机器人当前X / Y方向线速度 
float 
m/s 
Height 
当前机身高度 
float 
m 
Payload 
无效参数 
/ 
/ 
RemainMile 
预计剩余续航里程 
float 
km 
MotorStatus[3]参数组反馈机器人各个关节的运动状态信息： 
参数项 
含义 
数据类型 
单位 
*HipX 
侧摆关节角度 
float 
rad 
*HipY 
髋关节角度 
float 
rad 
*Knee 
膝关节角度 
float 
rad 
*Wheel 
足轮转速 
float 
rad/s 
[3] MotorStatus 参数组中的各参数项左侧的星号*表示省略的参数名称的位置标识信息，
Left/Right 的含义为左/右侧，左侧为电池仓所在的一侧；Front/Back 含义为前/后侧，后侧
为有硬急停按钮的一侧。例如，LeftBackHipX 表示左后侧摆关节，该参数值的含义为左后侧
侧摆关节的角度，其它参数的名称与含义依此类推。 
1.3.1.3 设备状态上报 
该消息集以2Hz 的频率主动上报，用户可通过该上报获取机器人当前的设备状态信息。 
Type字段值 
Command字段值 
消息类型 
1002 
5 
获取机器人设备状态信息 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1002, 
 
 
"Command": 5, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"BatteryStatus": { 
 
 
 
 
"VoltageLeft": 0.0, 


|  |  |  |  |
| --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 |
|  |  |  |  |
| OmegaZ | Z方向角速度 | float | rad/s |
| LinearX / LinearY | 机器人当前X / Y方向线速度 | float | m/s |
| Height | 当前机身高度 | float | m |
| Payload | 无效参数 | / | / |
| RemainMile | 预计剩余续航里程 | float | km |


|  |  |  |  |
| --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 |
|  |  |  |  |
| *HipX | 侧摆关节角度 | float | rad |
| *HipY | 髋关节角度 | float | rad |
| *Knee | 膝关节角度 | float | rad |
| *Wheel | 足轮转速 | float | rad/s |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1002 | 5 | 获取机器人设备状态信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1002, |
| 4 | "Command": 5, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "BatteryStatus": { |
| 8 | "VoltageLeft": 0.0, |


---
## 第 21 页
---

DEEP Robotics 
 21 / 57 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
22 
23 
24 
25 
26 
27 
28 
29 
30 
31 
32 
33 
34 
35 
36 
37 
38 
39 
40 
41 
42 
43 
44 
45 
46 
47 
48 
49 
50 
51 
52 
 
 
 
 
"VoltageRight": 0.0, 
 
 
 
 
"BatteryLevelLeft": 0.0, 
 
 
 
 
"BatteryLevelRight": 0.0, 
 
 
 
 
"battery_temperatureLeft": 0.0, 
 
 
 
 
"battery_temperatureRight": 0.0, 
 
 
 
 
"chargeLeft":false, 
 
 
 
 
"chargeRight":false 
 
 
 
}, 
 
 
 
"DeviceTemperature": { 
 
 
 
 
"LeftFrontHipXMotor": 0.0, 
 
 
 
 
"LeftFrontHipXDriver": 0.0, 
 
 
 
 
"LeftFrontHipYMotor": 0.0, 
 
 
 
 
"LeftFrontHipYDriver": 0.0, 
 
 
 
 
"LeftFrontKneeMotor": 0.0, 
 
 
 
 
"LeftFrontKneeDriver": 0.0, 
 
 
 
 
"LeftFrontWheelMotor": 0.0, 
 
 
 
 
"LeftFrontWheelDriver": 0.0, 
 
 
 
 
"RightFrontHipXMotor": 0.0, 
 
 
 
 
"RightFrontHipXDriver": 0.0, 
 
 
 
 
"RightFrontHipYMotor": 0.0, 
 
 
 
 
"RightFrontHipYDriver": 0.0, 
 
 
 
 
"RightFrontKneeMotor": 0.0, 
 
 
 
 
"RightFrontKneeDriver": 0.0, 
 
 
 
 
"RightFrontWheelMotor": 0.0, 
 
 
 
 
"RightFrontWheelDriver": 0.0, 
 
 
 
 
"LeftBackHipXMotor": 0.0, 
 
 
 
 
"LeftBackHipXDriver": 0.0, 
 
 
 
 
"LeftBackHipYMotor": 0.0, 
 
 
 
 
"LeftBackHipYDriver": 0.0, 
 
 
 
 
"LeftBackKneeMotor": 0.0, 
 
 
 
 
"LeftBackKneeDriver": 0.0, 
 
 
 
 
"LeftBackWheelMotor": 0.0, 
 
 
 
 
"LeftBackWheelDriver": 0.0, 
 
 
 
 
"RightBackHipXMotor": 0.0, 
 
 
 
 
"RightBackHipXDriver": 0.0, 
 
 
 
 
"RightBackHipYMotor": 0.0, 
 
 
 
 
"RightBackHipYDriver": 0.0, 
 
 
 
 
"RightBackKneeMotor": 0.0, 
 
 
 
 
"RightBackKneeDriver": 0.0, 
 
 
 
 
"RightBackWheelMotor": 0.0, 
 
 
 
 
"RightBackWheelDriver": 0.0 
 
 
 
}, 
 
 
 
"Led": { 
 
 
 
 
"Fill": { 


| 9 | "VoltageRight": 0.0, |
| --- | --- |
| 10 | "BatteryLevelLeft": 0.0, |
| 11 | "BatteryLevelRight": 0.0, |
| 12 | "battery temperatureLeft": 0.0,
_ |
| 13 | "battery temperatureRight": 0.0,
_ |
| 14 | "chargeLeft":false, |
| 15 | "chargeRight":false |
| 16 | }, |
| 17 | "DeviceTemperature": { |
| 18 | "LeftFrontHipXMotor": 0.0, |
| 19 | "LeftFrontHipXDriver": 0.0, |
| 20 | "LeftFrontHipYMotor": 0.0, |
| 21 | "LeftFrontHipYDriver": 0.0, |
| 22 | "LeftFrontKneeMotor": 0.0, |
| 23 | "LeftFrontKneeDriver": 0.0, |
| 24 | "LeftFrontWheelMotor": 0.0, |
| 25 | "LeftFrontWheelDriver": 0.0, |
| 26 | "RightFrontHipXMotor": 0.0, |
| 27 | "RightFrontHipXDriver": 0.0, |
| 28 | "RightFrontHipYMotor": 0.0, |
| 29 | "RightFrontHipYDriver": 0.0, |
| 30 | "RightFrontKneeMotor": 0.0, |
| 31 | "RightFrontKneeDriver": 0.0, |
| 32 | "RightFrontWheelMotor": 0.0, |
| 33 | "RightFrontWheelDriver": 0.0, |
| 34 | "LeftBackHipXMotor": 0.0, |
| 35 | "LeftBackHipXDriver": 0.0, |
| 36 | "LeftBackHipYMotor": 0.0, |
| 37 | "LeftBackHipYDriver": 0.0, |
| 38 | "LeftBackKneeMotor": 0.0, |
| 39 | "LeftBackKneeDriver": 0.0, |
| 40 | "LeftBackWheelMotor": 0.0, |
| 41 | "LeftBackWheelDriver": 0.0, |
| 42 | "RightBackHipXMotor": 0.0, |
| 43 | "RightBackHipXDriver": 0.0, |
| 44 | "RightBackHipYMotor": 0.0, |
| 45 | "RightBackHipYDriver": 0.0, |
| 46 | "RightBackKneeMotor": 0.0, |
| 47 | "RightBackKneeDriver": 0.0, |
| 48 | "RightBackWheelMotor": 0.0, |
| 49 | "RightBackWheelDriver": 0.0 |
| 50 | }, |
| 51 | "Led": { |
| 52 | "Fill": { |


---
## 第 22 页
---

DEEP Robotics 
 22 / 57 
53 
54 
55 
56 
57 
58 
59 
60 
61 
62 
63 
64 
65 
66 
67 
68 
69 
70 
71 
72 
73 
74 
75 
76 
77 
78 
79 
80 
81 
82 
83 
84 
85 
86 
87 
88 
89 
90 
91 
92 
93 
94 
95 
96 
 
 
 
 
 
"Front":1, 
 
 
 
 
 
"Back":1 
    
 
 
} 
 
 
 
}, 
 
 
 
"GPS": { 
 
 
 
 
"Latitude":0.0, 
 
 
 
 
"Longitude":0.0, 
   
 
 
"Speed":0.0, 
 
 
 
 
"Course":0.0, 
 
 
 
 
"FixQuality":0.0, 
 
 
 
 
"NumSatellites":0, 
 
 
 
 
"Altitude":0.0, 
 
 
 
 
"HDOP":0.0, 
 
 
 
 
"VDOP":0, 
 
 
 
 
"PDOP":0.0, 
 
 
 
 
"VisibleSatellites":0 
 
 
 
}, 
 
 
 
"DevEnable":{ 
 
 
 
 
"FanSpeed":100, 
 
 
 
 
"LoadPower":1, 
 
 
 
 
"LedHost":1, 
 
 
 
 
"LedExt":1, 
 
 
 
 
"FP":1, 
 
 
 
 
"Lidar":{ 
 
 
 
 
 
"Front":1, 
 
 
 
 
 
"Back":1 
 
 
 
 
}, 
 
 
 
 
"GPS":1, 
 
 
 
 
"Video":{ 
 
 
 
 
 
"Front":1, 
 
 
 
 
 
"Back":1 
 
 
 
 
} 
 
 
 
}, 
 
 
 
"CPU":{ 
 
 
 
 
"AOS":{ 
 
 
 
 
 
"Temperature":0.0, 
 
 
 
 
 
"FrequencyInt":0.0, 
 
 
 
 
 
"FrequencyApp":0.0 
 
 
 
 
}, 
 
 
 
 
"NOS":{ 
 
 
 
 
 
"Temperature":0.0, 
 
 
 
 
 
"FrequencyInt":0.0, 
 
 
 
 
 
"FrequencyApp":0.0 
 
 
 
 
}, 


| 53 | "Front":1, |
| --- | --- |
| 54 | "Back":1 |
| 55 | } |
| 56 | }, |
| 57 | "GPS": { |
| 58 | "Latitude":0.0, |
| 59 | "Longitude":0.0, |
| 60 | "Speed":0.0, |
| 61 | "Course":0.0, |
| 62 | "FixQuality":0.0, |
| 63 | "NumSatellites":0, |
| 64 | "Altitude":0.0, |
| 65 | "HDOP":0.0, |
| 66 | "VDOP":0, |
| 67 | "PDOP":0.0, |
| 68 | "VisibleSatellites":0 |
| 69 | }, |
| 70 | "DevEnable":{ |
| 71 | "FanSpeed":100, |
| 72 | "LoadPower":1, |
| 73 | "LedHost":1, |
| 74 | "LedExt":1, |
| 75 | "FP":1, |
| 76 | "Lidar":{ |
| 77 | "Front":1, |
| 78 | "Back":1 |
| 79 | }, |
| 80 | "GPS":1, |
| 81 | "Video":{ |
| 82 | "Front":1, |
| 83 | "Back":1 |
| 84 | } |
| 85 | }, |
| 86 | "CPU":{ |
| 87 | "AOS":{ |
| 88 | "Temperature":0.0, |
| 89 | "FrequencyInt":0.0, |
| 90 | "FrequencyApp":0.0 |
| 91 | }, |
| 92 | "NOS":{ |
| 93 | "Temperature":0.0, |
| 94 | "FrequencyInt":0.0, |
| 95 | "FrequencyApp":0.0 |
| 96 | }, |


---
## 第 23 页
---

DEEP Robotics 
 23 / 57 
97 
98 
99 
100 
101 
102 
103 
104 
105 
 
 
 
 
"GOS":{ 
 
 
 
 
 
"Temperature":0.0, 
 
 
 
 
 
"FrequencyInt":0.0, 
 
 
 
 
 
"FrequencyApp":0.0 
 
 
 
 
} 
 
 
 
} 
 
 
} 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
22 
23 
24 
25 
26 
27 
28 
29 
30 
31 
32 
33 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1002</Type> 
 
<Command>5</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<BatteryStatus> 
 
 
 
<VoltageLeft>0.0</VoltageLeft> 
 
 
 
<VoltageRight>0.0</VoltageRight> 
 
 
 
<BatteryLevelLeft>0.0</BatteryLevelLeft> 
 
 
 
<BatteryLevelRight>0.0</BatteryLevelRight> 
 
 
 
<Battery_temperatureLeft>0.0</Battery_temperatureLeft> 
 
 
 
<Battery_temperatureRight>0.0</Battery_temperatureRight> 
 
 
 
<chargeLeft>false</chargeLeft> 
 
 
 
<chargeRight>false</chargeRight> 
 
 
</BatteryStatus> 
 
 
<DeviceTemperature> 
 
 
 
<LeftFrontHipXMotor>0.0</LeftFrontHipXMotor> 
 
 
 
<LeftFrontHipXDriver>0.0</LeftFrontHipXDriver> 
 
 
 
<LeftFrontHipYMotor>0.0</LeftFrontHipYMotor> 
 
 
 
<LeftFrontHipYDriver>0.0</LeftFrontHipYDriver> 
 
 
 
<LeftFrontKneeMotor>0.0</LeftFrontKneeMotor> 
 
 
 
<LeftFrontKneeDriver>0.0</LeftFrontKneeDriver> 
 
 
 
<LeftFrontWheelMotor>0.0</LeftFrontWheelMotor> 
 
 
 
<LeftFrontWheelDriver>0.0</LeftFrontWheelDriver> 
 
 
 
<RightFrontHipXMotor>0.0</RightFrontHipXMotor> 
 
 
 
<RightFrontHipXDriver>0.0</RightFrontHipXDriver> 
 
 
 
<RightFrontHipYMotor>0.0</RightFrontHipYMotor> 
 
 
 
<RightFrontHipYDriver>0.0</RightFrontHipYDriver> 
 
 
 
<RightFrontKneeMotor>0.0</RightFrontKneeMotor> 
 
 
 
<RightFrontKneeDriver>0.0</RightFrontKneeDriver> 
 
 
 
<RightFrontWheelMotor>0.0</RightFrontWheelMotor> 
 
 
 
<RightFrontWheelDriver>0.0</RightFrontWheelDriver> 


| 97 | "GOS":{ |
| --- | --- |
| 98 | "Temperature":0.0, |
| 99 | "FrequencyInt":0.0, |
| 100 | "FrequencyApp":0.0 |
| 101 | } |
| 102 | } |
| 103 | } |
| 104 | } |
| 105 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1002</Type> |
| 4 | <Command>5</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <BatteryStatus> |
| 8 | <VoltageLeft>0.0</VoltageLeft> |
| 9 | <VoltageRight>0.0</VoltageRight> |
| 10 | <BatteryLevelLeft>0.0</BatteryLevelLeft> |
| 11 | <BatteryLevelRight>0.0</BatteryLevelRight> |
| 12 | <Battery temperatureLeft>0.0</Battery temperatureLeft>
_ _ |
| 13 | <Battery temperatureRight>0.0</Battery temperatureRight>
_ _ |
| 14 | <chargeLeft>false</chargeLeft> |
| 15 | <chargeRight>false</chargeRight> |
| 16 | </BatteryStatus> |
| 17 | <DeviceTemperature> |
| 18 | <LeftFrontHipXMotor>0.0</LeftFrontHipXMotor> |
| 19 | <LeftFrontHipXDriver>0.0</LeftFrontHipXDriver> |
| 20 | <LeftFrontHipYMotor>0.0</LeftFrontHipYMotor> |
| 21 | <LeftFrontHipYDriver>0.0</LeftFrontHipYDriver> |
| 22 | <LeftFrontKneeMotor>0.0</LeftFrontKneeMotor> |
| 23 | <LeftFrontKneeDriver>0.0</LeftFrontKneeDriver> |
| 24 | <LeftFrontWheelMotor>0.0</LeftFrontWheelMotor> |
| 25 | <LeftFrontWheelDriver>0.0</LeftFrontWheelDriver> |
| 26 | <RightFrontHipXMotor>0.0</RightFrontHipXMotor> |
| 27 | <RightFrontHipXDriver>0.0</RightFrontHipXDriver> |
| 28 | <RightFrontHipYMotor>0.0</RightFrontHipYMotor> |
| 29 | <RightFrontHipYDriver>0.0</RightFrontHipYDriver> |
| 30 | <RightFrontKneeMotor>0.0</RightFrontKneeMotor> |
| 31 | <RightFrontKneeDriver>0.0</RightFrontKneeDriver> |
| 32 | <RightFrontWheelMotor>0.0</RightFrontWheelMotor> |
| 33 | <RightFrontWheelDriver>0.0</RightFrontWheelDriver> |


---
## 第 24 页
---

DEEP Robotics 
 24 / 57 
34 
35 
36 
37 
38 
39 
40 
41 
42 
43 
44 
45 
46 
47 
48 
49 
50 
51 
52 
53 
54 
55 
56 
57 
58 
59 
60 
61 
62 
63 
64 
65 
66 
67 
68 
69 
70 
71 
72 
73 
74 
75 
76 
77 
 
 
 
<LeftBackHipXMotor>0.0</LeftBackHipXMotor> 
 
 
 
<LeftBackHipXDriver>0.0</LeftBackHipXDriver> 
 
 
 
<LeftBackHipYMotor>0.0</LeftBackHipYMotor> 
 
 
 
<LeftBackHipYDriver>0.0</LeftBackHipYDriver> 
 
 
 
<LeftBackKneeMotor>0.0</LeftBackKneeMotor> 
 
 
 
<LeftBackKneeDriver>0.0</LeftBackKneeDriver> 
 
 
 
<LeftBackWheelMotor>0.0</LeftBackWheelMotor> 
 
 
 
<LeftBackWheelDriver>0.0</LeftBackWheelDriver> 
 
 
 
<RightBackHipXMotor>0.0</RightBackHipXMotor> 
 
 
 
<RightBackHipXDriver>0.0</RightBackHipXDriver> 
 
 
 
<RightBackHipYMotor>0.0</RightBackHipYMotor> 
 
 
 
<RightBackHipYDriver>0.0</RightBackHipYDriver> 
 
 
 
<RightBackKneeMotor>0.0</RightBackKneeMotor> 
 
 
 
<RightBackKneeDriver>0.0</RightBackKneeDriver> 
 
 
 
<RightBackWheelMotor>0.0</RightBackWheelMotor> 
 
 
 
<RightBackWheelDriver>0.0</RightBackWheelDriver> 
 
 
</DeviceTemperature> 
 
 
<Led>  
 
 
 
<Fill> 
 
 
 
 
<Front>0</Front> 
 
 
 
 
<Back>0</Back> 
 
 
 
</Fill> 
 
 
</Led> 
 
 
<GPS> 
 
 
 
<Latitude>0.0</Latitude> 
 
 
 
<Longitude>0.0</Longitude> 
 
 
 
<Speed>0.0</Speed> 
 
 
 
<Course>0.0</Course> 
 
 
 
<FixQuality>0.0</FixQuality> 
 
 
 
<NumSatellites>0</NumSatellites> 
 
 
 
<Altitude>0.0</Altitude> 
 
 
 
<HDOP>0.0</HDOP> 
 
 
 
<VDOP>0.0</VDOP> 
 
 
 
<PDOP>0.0</PDOP> 
 
 
 
<VisibleSatellites>0</VisibleSatellites> 
 
 
</GPS> 
 
 
<DevEnable> 
 
 
 
<FanSpeed>100</FanSpeed> 
 
 
 
<LoadPower>0</LoadPower> 
 
 
 
<LedHost>0</LedHost> 
 
 
 
<LedExt>0</LedExt> 
 
 
 
<FP>0</FP> 
 
 
 
<Lidar> 
 
 
 
 
<Front>0</Front> 


| 34 | <LeftBackHipXMotor>0.0</LeftBackHipXMotor> |
| --- | --- |
| 35 | <LeftBackHipXDriver>0.0</LeftBackHipXDriver> |
| 36 | <LeftBackHipYMotor>0.0</LeftBackHipYMotor> |
| 37 | <LeftBackHipYDriver>0.0</LeftBackHipYDriver> |
| 38 | <LeftBackKneeMotor>0.0</LeftBackKneeMotor> |
| 39 | <LeftBackKneeDriver>0.0</LeftBackKneeDriver> |
| 40 | <LeftBackWheelMotor>0.0</LeftBackWheelMotor> |
| 41 | <LeftBackWheelDriver>0.0</LeftBackWheelDriver> |
| 42 | <RightBackHipXMotor>0.0</RightBackHipXMotor> |
| 43 | <RightBackHipXDriver>0.0</RightBackHipXDriver> |
| 44 | <RightBackHipYMotor>0.0</RightBackHipYMotor> |
| 45 | <RightBackHipYDriver>0.0</RightBackHipYDriver> |
| 46 | <RightBackKneeMotor>0.0</RightBackKneeMotor> |
| 47 | <RightBackKneeDriver>0.0</RightBackKneeDriver> |
| 48 | <RightBackWheelMotor>0.0</RightBackWheelMotor> |
| 49 | <RightBackWheelDriver>0.0</RightBackWheelDriver> |
| 50 | </DeviceTemperature> |
| 51 | <Led> |
| 52 | <Fill> |
| 53 | <Front>0</Front> |
| 54 | <Back>0</Back> |
| 55 | </Fill> |
| 56 | </Led> |
| 57 | <GPS> |
| 58 | <Latitude>0.0</Latitude> |
| 59 | <Longitude>0.0</Longitude> |
| 60 | <Speed>0.0</Speed> |
| 61 | <Course>0.0</Course> |
| 62 | <FixQuality>0.0</FixQuality> |
| 63 | <NumSatellites>0</NumSatellites> |
| 64 | <Altitude>0.0</Altitude> |
| 65 | <HDOP>0.0</HDOP> |
| 66 | <VDOP>0.0</VDOP> |
| 67 | <PDOP>0.0</PDOP> |
| 68 | <VisibleSatellites>0</VisibleSatellites> |
| 69 | </GPS> |
| 70 | <DevEnable> |
| 71 | <FanSpeed>100</FanSpeed> |
| 72 | <LoadPower>0</LoadPower> |
| 73 | <LedHost>0</LedHost> |
| 74 | <LedExt>0</LedExt> |
| 75 | <FP>0</FP> |
| 76 | <Lidar> |
| 77 | <Front>0</Front> |


---
## 第 25 页
---

DEEP Robotics 
 25 / 57 
78 
79 
80 
81 
82 
83 
84 
85 
86 
87 
88 
89 
90 
91 
92 
93 
94 
95 
96 
97 
98 
99 
100 
101 
102 
103 
104 
 
 
 
 
<Back>0</Back> 
 
 
 
</Lidar> 
 
 
 
<GPS>0</GPS> 
 
 
 
<Video> 
 
 
 
 
<Front>0</Front> 
 
 
 
 
<Back>0</Back> 
 
 
 
</Video> 
 
 
</DevEnable> 
 
 
<CPU> 
 
 
 
<AOS> 
 
 
 
 
<Temperature>0.0</Temperature> 
 
 
 
 
<FrequencyInt>0.0</FrequencyInt> 
 
 
 
 
<FrequencyApp>0.0</FrequencyApp> 
 
 
 
</AOS> 
 
 
 
<NOS> 
 
 
 
 
<Temperature>0.0</Temperature> 
 
 
 
 
<FrequencyInt>0.0</FrequencyInt> 
 
 
 
 
<FrequencyApp>0.0</FrequencyApp> 
 
 
 
</NOS> 
 
 
 
<GOS> 
 
 
 
 
<Temperature>0.0</Temperature> 
 
 
 
 
<FrequencyInt>0.0</FrequencyInt> 
 
 
 
 
<FrequencyApp>0.0</FrequencyApp> 
 
 
 
</GOS> 
 
 
</CPU> 
 
</Items> 
</PatrolDevice> 
该响应消息中，Items 字段包含以下参数组： 
该响应消息中，Items 字段包含BatteryStatus、DeviceTemperature、Led、GPS、
DevEnable 和CPU 六组参数。 
BatteryStatus[4]参数组反馈电池的状态信息： 
参数项 
含义 
数据类型 单位 
参数值说明 
Voltage* 
电池电压 
float 
V 
 
BatteryLevel* 
电池剩余电量百分比 
int 
% 
[0,100] 
battery_temperature* 
电池温度 
float 
℃ 
 
charge* 
电池充电状态 
bool 
/ 
true=充电中, false=未在充电 
DeviceTemperature[5]参数组反馈各关节电机和驱动器的温度信息： 


| 78 | <Back>0</Back> |
| --- | --- |
| 79 | </Lidar> |
| 80 | <GPS>0</GPS> |
| 81 | <Video> |
| 82 | <Front>0</Front> |
| 83 | <Back>0</Back> |
| 84 | </Video> |
| 85 | </DevEnable> |
| 86 | <CPU> |
| 87 | <AOS> |
| 88 | <Temperature>0.0</Temperature> |
| 89 | <FrequencyInt>0.0</FrequencyInt> |
| 90 | <FrequencyApp>0.0</FrequencyApp> |
| 91 | </AOS> |
| 92 | <NOS> |
| 93 | <Temperature>0.0</Temperature> |
| 94 | <FrequencyInt>0.0</FrequencyInt> |
| 95 | <FrequencyApp>0.0</FrequencyApp> |
| 96 | </NOS> |
| 97 | <GOS> |
| 98 | <Temperature>0.0</Temperature> |
| 99 | <FrequencyInt>0.0</FrequencyInt> |
| 100 | <FrequencyApp>0.0</FrequencyApp> |
| 101 | </GOS> |
| 102 | </CPU> |
| 103 | </Items> |
| 104 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Voltage* | 电池电压 | float | V |  |
| BatteryLevel* | 电池剩余电量百分比 | int | % | [0,100] |
| battery_temperature* | 电池温度 | float | ℃ |  |
| charge* | 电池充电状态 | bool | / | true=充电中, false=未在充电 |


---
## 第 26 页
---

DEEP Robotics 
 26 / 57 
参数项 
含义 
数据类型 
单位 
参数值说明 
*Motor 
电机温度 
float 
℃ 
 
*Driver 
电机驱动器温度 
float 
℃ 
 
Led 参数组反馈机器人前后照明灯的状态： 
参数项 
含义 
数据类型 
单位 
参数值说明 
Fill:Front / Back 
前/后侧照明灯状态 
int 
/ 
关闭=0，开启=1 
GPS 参数组反馈卫星定位模块的定位数据： 
参数项 
含义 
数据类型 单位 
参数值说明 
Latitude 
机器人在世界坐标系下的纬度 
float 
deg 
正值表示赤道以北，负值表示
赤道以南 
Longitude 
机器人在世界坐标系下的经度 
float 
deg 
正值表示本初子午线以东，负
值表示本初子午线以西 
Speed 
地面速度 
float 
km/h 
 
Course 
机器人在世界坐标系下的航向 
float 
deg 
行进方向与正北方向的夹角 
FixQuality 
机器人的定位质量 
float 
/ 
数值越大通常表示定位越准确 
NumSatellites 
参与定位的卫星数量 
int 
个 
 
Altitude 
机器人的海拔高度  
float 
m 
 
HDOP 
Position Dilution of Precision 
位置精度因子 
反映定位精度的综合指标 
float 
/ 
[0.5，99.9] 
数值越小精度越高 
VDOP 
Horizontal Dilution of Precision 
水平精度因子 
反映水平方向的定位精度 
float 
/ 
PDOP 
Vertical Dilution of Precision 
垂直精度因子 
反映垂直方向的定位精度 
float 
/ 
VisibleSatellites 
可见卫星的总数 
int 
个 
 
DevEnable 参数组反馈机器人内部器件的运行状态，其中部分参数项含义如下： 
参数项 
含义 
数据类型 
单位 
参数值说明 
Lidar:Front/Back 
前后激光雷达电源开关 
int 
/ 
关闭=0，开启=1 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| *Motor | 电机温度 | float | ℃ |  |
| *Driver | 电机驱动器温度 | float | ℃ |  |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Fill:Front / Back | 前/后侧照明灯状态 | int | / | 关闭=0，开启=1 |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Latitude | 机器人在世界坐标系下的纬度 | float | deg | 正值表示赤道以北，负值表示
赤道以南 |
| Longitude | 机器人在世界坐标系下的经度 | float | deg | 正值表示本初子午线以东，负
值表示本初子午线以西 |
| Speed | 地面速度 | float | km/h |  |
| Course | 机器人在世界坐标系下的航向 | float | deg | 行进方向与正北方向的夹角 |
| FixQuality | 机器人的定位质量 | float | / | 数值越大通常表示定位越准确 |
| NumSatellites | 参与定位的卫星数量 | int | 个 |  |
| Altitude | 机器人的海拔高度 | float | m |  |
| HDOP | Position Dilution of Precision
位置精度因子
反映定位精度的综合指标 | float | / | [0.5，99.9]
数值越小精度越高 |
| VDOP | Horizontal Dilution of Precision
水平精度因子
反映水平方向的定位精度 | float | / |  |
| PDOP | Vertical Dilution of Precision
垂直精度因子
反映垂直方向的定位精度 | float | / |  |
| VisibleSatellites | 可见卫星的总数 | int | 个 |  |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Lidar:Front/Back | 前后激光雷达电源开关 | int | / | 关闭=0，开启=1 |


---
## 第 27 页
---

DEEP Robotics 
 27 / 57 
参数项 
含义 
数据类型 
单位 
参数值说明 
GPS 
卫星定位模块电源开关 
int 
/ 
关闭=0，开启=1 
Video:Front/Back 
前后摄像头电源开关 
int 
/ 
关闭=0，开启=1 
CPU[6]参数组反馈机器人内部各CPU 的运行状态： 
参数项 
含义 
数据类型 
单位 
参数值说明 
Temperature 
CPU最高温度 
float 
℃ 
 
FrequencyInt 
小核（A55）CPU占用率 
float 
% 
 
FrequencyApp 
大核（A76）CPU占用率 
float 
% 
 
[4] BatteryStatus 参数组中各参数项右侧的星号*表示省略的参数名称的位置标识信息，
Left/Right 的含义为左/右侧，右侧为靠近硬急停按钮的一侧。例如，BatteryLevelRight 含义
为右侧（靠近硬急停按钮一侧）电池的剩余电量百分比，其它参数的含义依此类推。 
[5] DeviceTemperature 参数组中各参数项左侧的星号*表示省略的参数名称信息，请参考
1.3.1.3 中所述[3]确定关节的名称。例如，RightFrontKneeDriver 表示右前膝关节驱动器，该
参数值的含义为右前膝关节驱动器的温度信息，其它参数的名称与含义依此类推。 
[6] CPU 参数组中，AOS、NOS、GOS 分别对应机器人内部三个主机的CPU，其中GOS 仅在
山猫M20 Pro 上有效。 
1.3.2 获取异常状态信息 
用户可通过该上报获取机器人当前的异常状态信息。 
Type字段值 
Command字段值 
消息类型 
1002 
3 
获取异常状态信息 
 
【注意】一般情况下，机器人会主动向发送心跳指令（参考1.2.1）的IP 和端口以2Hz 的
固定频率上报；当状态发生变更时（如异常发生或异常解除），机器人会额外进行一次上
报。 
JSON 格式响应： 
1 
{ 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| GPS | 卫星定位模块电源开关 | int | / | 关闭=0，开启=1 |
| Video:Front/Back | 前后摄像头电源开关 | int | / | 关闭=0，开启=1 |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Temperature | CPU最高温度 | float | ℃ |  |
| FrequencyInt | 小核（A55）CPU占用率 | float | % |  |
| FrequencyApp | 大核（A76）CPU占用率 | float | % |  |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1002 | 3 | 获取异常状态信息 |


| 1 | { |
| --- | --- |


---
## 第 28 页
---

DEEP Robotics 
 28 / 57 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
 
"PatrolDevice": { 
 
 
"Type": 1002, 
 
 
"Command": 3, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": {    
 
 
 
"ErrorList":[ 
 
 
 
{ 
 
 
 
 
"errorCode": errorCode, 
 
 
 
 
"component": value 
 
 
 
}, 
 
 
 
{ 
 
 
 
 
"errorCode": errorCode, 
 
 
 
 
"component": value 
 
 
 
}, 
 
 
 
…//其它省略的错误 
 
 
 
] 
 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
  <Type>1002</Type> 
  <Command>3</Command> 
  <Time>2023-01-01 00:00:00</Time> 
  <Items> 
    <ErrorList> 
      <errorCode>errorCode</errorCode> 
      <component>value</component> 
    </ErrorList> 
    <ErrorList> 
      <errorCode>errorCode</errorCode> 
      <component>value</component> 
    </ErrorList> 
  </Items> 
</PatrolDevice> 
一次响应可能包含多组Error，每组Error 包含以下参数项： 
参数项 
含义 
数据类型 单位 
参数值说明 
errorCode 
错误码 
int 
/ 
详见错误码表 
component 
发生错误的部件位置信息[7] 
int 
/ 
以bit位作为部件号 


| 2 | "PatrolDevice": { |
| --- | --- |
| 3 | "Type": 1002, |
| 4 | "Command": 3, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "ErrorList":[ |
| 8 | { |
| 9 | "errorCode": errorCode, |
| 10 | "component": value |
| 11 | }, |
| 12 | { |
| 13 | "errorCode": errorCode, |
| 14 | "component": value |
| 15 | }, |
| 16 | …//其它省略的错误 |
| 17 | ] |
| 18 | } |
| 19 | } |
| 20 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1002</Type> |
| 4 | <Command>3</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <ErrorList> |
| 8 | <errorCode>errorCode</errorCode> |
| 9 | <component>value</component> |
| 10 | </ErrorList> |
| 11 | <ErrorList> |
| 12 | <errorCode>errorCode</errorCode> |
| 13 | <component>value</component> |
| 14 | </ErrorList> |
| 15 | </Items> |
| 16 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| errorCode | 错误码 | int | / | 详见错误码表 |
| component | 发生错误的部件位置信息[7] | int | / | 以bit位作为部件号 |


---
## 第 29 页
---

DEEP Robotics 
 29 / 57 
[7]当关节或电池发生异常时用于确定发生异常的具体关节或电池。关节编号可参考1.3.1.2 运
控状态上报中的 <MotorStatus>参数组，按照FL/FR/BL/BR+HipX/HipY/Knee/Wheel 的顺序从
低位到高位进行编号，例如0x21（0000 0000 0010 0001）则表示：第一个关节（第0 位，
LeftFrontHipX 关节）和第6 个关节（第5 位，RightFrontHipY）出现errorCode 所表示的错
误，其它关节的位号依此类推；电池编号的第0 位表示后侧电池（靠近硬急停按钮的一侧），
第1 位表示前侧电池。 
errorCode 的值对应的含义如下表所示： 
参数值 
含义 
参数值 
含义 
0x8001 
电机温度预警 
0x8108 
电池单体欠压保护 
0x8002 
电机温度过高保护 
0x8112 
电池放电低温保护 
0x8003 
电机温度致命截止 
0x8115 
电池充电过温保护 
0x8007 
关节驱动器过温 
0x8116 
电池充电低温保护 
0x8008 
驱动器欠压保护 
0x8117 
电池单体过压保护 
0x8009 
驱动器过压保护 
0x8118 
电池整组过压保护 
0x8012 
与关节驱动器通讯超时 
0x8119 
电池整组欠压保护 
0x8016 
编码器无值 
0x8120 
电池充电过流保护 
0x8020 
驱动器过流保护 
0x8121 
电池放电过流保护 
0x8021 
温感线断联 
0x8122 
短路保护 
0x8022 
关节角超限 
0x8123 
电池前端检测IC 错误 
0x8024 
关节数据为nan 
0x8124 
电池软件锁定MOS 
0x8025 
关节数据更新错误 
0x8125 
电池放电过温预警 
0x8027 
机身姿态错误 
0x8126 
电池放电低温预警 
0x8028 
驱动器状态错误 
0x8127 
电池充电过温预警 
0x8029 
运动姿态错误 
0x8128 
电池充电低温预警 
0x8030 
关节驱动器过温预警 
0x8129 
电池输出最低电压预警 
0x8102 
低电量预警 
0x8201 
CPU 占用率过高预警 
0x8103 
保护电量 
0x8202 
CPU 温度过高预警 


|  |  |  |  |
| --- | --- | --- | --- |
| 参数值 | 含义 | 参数值 | 含义 |
|  |  |  |  |
|  | 电机温度预警 |  | 电池单体欠压保护 |
| 0x8001 |  | 0x8108 |  |
|  |  |  |  |
|  | 电机温度过高保护 |  | 电池放电低温保护 |
| 0x8002 |  | 0x8112 |  |
|  |  |  |  |
|  | 电机温度致命截止 |  | 电池充电过温保护 |
| 0x8003 |  | 0x8115 |  |
|  |  |  |  |
|  | 关节驱动器过温 |  | 电池充电低温保护 |
| 0x8007 |  | 0x8116 |  |
|  |  |  |  |
|  | 驱动器欠压保护 |  | 电池单体过压保护 |
| 0x8008 |  | 0x8117 |  |
|  |  |  |  |
|  | 驱动器过压保护 |  | 电池整组过压保护 |
| 0x8009 |  | 0x8118 |  |
|  |  |  |  |
|  | 与关节驱动器通讯超时 |  | 电池整组欠压保护 |
| 0x8012 |  | 0x8119 |  |
|  |  |  |  |
|  | 编码器无值 |  | 电池充电过流保护 |
| 0x8016 |  | 0x8120 |  |
|  |  |  |  |
|  | 驱动器过流保护 |  | 电池放电过流保护 |
| 0x8020 |  | 0x8121 |  |
|  |  |  |  |
|  | 温感线断联 |  | 短路保护 |
| 0x8021 |  | 0x8122 |  |
|  |  |  |  |
|  | 关节角超限 |  | 电池前端检测IC 错误 |
| 0x8022 |  | 0x8123 |  |
|  |  |  |  |
|  | 关节数据为nan |  | 电池软件锁定MOS |
| 0x8024 |  | 0x8124 |  |
|  |  |  |  |
|  | 关节数据更新错误 |  | 电池放电过温预警 |
| 0x8025 |  | 0x8125 |  |
|  |  |  |  |
|  | 机身姿态错误 |  | 电池放电低温预警 |
| 0x8027 |  | 0x8126 |  |
|  |  |  |  |
|  | 驱动器状态错误 |  | 电池充电过温预警 |
| 0x8028 |  | 0x8127 |  |
|  |  |  |  |
|  | 运动姿态错误 |  | 电池充电低温预警 |
| 0x8029 |  | 0x8128 |  |
|  |  |  |  |
|  | 关节驱动器过温预警 |  | 电池输出最低电压预警 |
| 0x8030 |  | 0x8129 |  |
|  |  |  |  |
|  | 低电量预警 |  | CPU 占用率过高预警 |
| 0x8102 |  | 0x8201 |  |
|  |  |  |  |
|  | 保护电量 |  | CPU 温度过高预警 |
| 0x8103 |  | 0x8202 |  |
|  |  |  |  |


---
## 第 30 页
---

DEEP Robotics 
 30 / 57 
参数值 
含义 
参数值 
含义 
0x8106 
电池输出最低电压保护 
0x8211 
CPU 占用率过高保护 
0x8107 
电池放电过温保护 
0x8212 
CPU 温度过高保护 
1.3.3 休眠状态及设置信息查询 
用户可通过该请求查询机器人当前的休眠状态及设置信息。 
Type字段值 
Command字段值 
消息类型 
1101 
7 
查询机器人休眠状态及设置信息 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1101, 
 
 
"Command": 7, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1101</Type> 
 
<Command>7</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
响应 
JSON 格式响应： 
1 
2 
3 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1101, 


|  |  |  |  |
| --- | --- | --- | --- |
| 参数值 | 含义 | 参数值 | 含义 |
|  |  |  |  |
|  | 电池输出最低电压保护 |  | CPU 占用率过高保护 |
| 0x8106 |  | 0x8211 |  |
|  |  |  |  |
|  | 电池放电过温保护 |  | CPU 温度过高保护 |
| 0x8107 |  | 0x8212 |  |
|  |  |  |  |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1101 | 7 | 查询机器人休眠状态及设置信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1101, |
| 4 | "Command": 7, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1101</Type> |
| 4 | <Command>7</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | </Items> |
| 8 | </PatrolDevice> |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1101, |


---
## 第 31 页
---

DEEP Robotics 
 31 / 57 
4 
5 
6 
7 
8 
9 
10 
11 
12 
 
 
"Command": 7, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"Sleep":false, 
 
 
 
"Auto":true, 
 
 
 
"Time":5 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1101</Type> 
 
<Command>7</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<Sleep>0</Sleep> 
 
 
<Auto>0</Auto> 
 
 
<Time>5</Time> 
</Items> 
</PatrolDevice> 
Items 字段中的参数项含义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
Sleep 
机器人休眠状态 
bool 
/ 
已休眠  =  true 
未休眠 = false 
Auto 
是否自动进入休眠模式 
bool 
/ 
到达时间后自动进入休眠模式 = true 
不会自动进入休眠模式 = false 
Time 
无消息下发后自动进入休眠模式的等
待时间 
int 
分钟 
[5, 30] 
1.4 巡检类ASDU 消息集 
【注意】本节包含的ASDU 消息集仅M20 Pro 机器人支持，M20 机器人不支持本节指令。 
1.4.1 初始化和重置定位 
用户可通过该请求初始化机器人定位。 


| 4 | "Command": 7, |
| --- | --- |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Sleep":false, |
| 8 | "Auto":true, |
| 9 | "Time":5 |
| 10 | } |
| 11 | } |
| 12 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1101</Type> |
| 4 | <Command>7</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <Sleep>0</Sleep> |
| 8 | <Auto>0</Auto> |
| 9 | <Time>5</Time> |
| 10 | </Items> |
| 11 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Sleep | 机器人休眠状态 | bool | / | 已休眠 = true
未休眠 = false |
| Auto | 是否自动进入休眠模式 | bool | / | 到达时间后自动进入休眠模式 = true
不会自动进入休眠模式 = false |
| Time | 无消息下发后自动进入休眠模式的等
待时间 | int | 分钟 | [5, 30] |


---
## 第 32 页
---

DEEP Robotics 
 32 / 57 
Type字段值 
Command字段值 
消息类型 
2101 
1 
初始化和重置定位 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2101, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"PosX":0.0, 
 
 
 
"PosY":0.0, 
 
 
 
"PosZ":0.0, 
 
 
"Yaw":0.0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>2101</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<PosX>0.0</PosX> 
 
 
<PosY>0.0</PosY> 
 
 
<PosZ>0.0</PosZ> 
 
 
<Yaw>0.0</Yaw> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 
单位 
PosX/PosY/PosZ 
机器人在地图坐标系[8]下需要重新定位的坐标 
float 
m 
Yaw 
机器人在地图坐标系[8]下绕Z轴旋转的姿态角 
float 
rad 
[8]机器人在地图坐标系和像素坐标系中的位置坐标换算公式如下：  


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 2101 | 1 | 初始化和重置定位 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2101, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "PosX":0.0, |
| 8 | "PosY":0.0, |
| 9 | "PosZ":0.0, |
| 10 | "Yaw":0.0 |
| 11 | } |
| 12 | } |
| 13 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2101</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <PosX>0.0</PosX> |
| 8 | <PosY>0.0</PosY> |
| 9 | <PosZ>0.0</PosZ> |
| 10 | <Yaw>0.0</Yaw> |
| 11 | </Items> |
| 12 | </PatrolDevice> |


|  |  |  |  |
| --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 |
|  |  |  |  |
| PosX/PosY/PosZ | 机器人在地图坐标系[8]下需要重新定位的坐标 | float | m |
| Yaw | 机器人在地图坐标系[8]下绕Z轴旋转的姿态角 | float | rad |


---
## 第 33 页
---

DEEP Robotics 
 33 / 57 
൞
xp = PosX −X0
Res
         
yp = H −PosY −Y0
Res
          (xp, yp取整) 
 
 
地图坐标系 
像素坐标系 
其中：(xp, yp)是像素坐标系下的坐标值，其余参数信息位于occ_grid.yaml 文件中，请参照
《山猫M20 Pro 软件使用手册》进地图文件夹查看occ_grid.yaml 的参数。 
响应 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2101, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"ErrorCode":0 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>2101</Type> 
 
<Command>1</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<ErrorCode>1</ErrorCode> 
</Items> 
</PatrolDevice> 
Items 字段中的参数项含义如下： 


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2101, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "ErrorCode":0 |
| 8 | } |
| 9 | } |
| 10 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2101</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <ErrorCode>1</ErrorCode> |
| 8 | </Items> |
| 9 | </PatrolDevice> |


---
## 第 34 页
---

DEEP Robotics 
 34 / 57 
参数项 
含义 
数据类型 单位 
参数值说明 
ErrorCode 
执行初始化定位指令的结果 
int 
/ 
 初始化定位成功 =  0 
初始化定位失败 = 1 
1.4.2 获取地图坐标系下的位置信息 
用户可通过该请求获取机器人当前在地图坐标系下的位置信息。 
Type字段值 
Command字段值 
消息类型 
1007 
2 
获取地图坐标系下机器人位置信息 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1007, 
 
 
"Command": 2, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1007</Type> 
 
<Command>2</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
响应 
JSON 格式响应： 
1 
2 
3 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1007, 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| ErrorCode | 执行初始化定位指令的结果 | int | / | 初始化定位成功 = 0
初始化定位失败 = 1 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1007 | 2 | 获取地图坐标系下机器人位置信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1007, |
| 4 | "Command": 2, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1007</Type> |
| 4 | <Command>2</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | </Items> |
| 8 | </PatrolDevice> |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1007, |


---
## 第 35 页
---

DEEP Robotics 
 35 / 57 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
 
 
"Command": 2, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"Location":1, 
 
 
 
"PosX":0.0, 
 
 
 
"PosY":0.0, 
 
 
 
"PosZ":0.0, 
 
 
 
"Roll":0.0, 
 
 
 
"Pitch":0.0, 
 
 
 
"Yaw":0.0 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1007</Type> 
 
<Command>2</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<Location>1</Location> 
 
 
<PosX>0.0</PosX> 
 
 
<PosY>0.0</PosY> 
 
 
<PosZ>0.0</PosZ> 
 
 
<Roll>0.0</Roll> 
 
 
<Pitch>0.0</Pitch> 
 
 
<Yaw>0.0</Yaw> 
</Items> 
</PatrolDevice> 
Items 字段中的参数项含义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
Location 
定位状态 
int 
/ 
定位正常 =  0 
定位丢失 = 1 
PosX/PosY/PosZ 
机器人在地图坐标系[8]下的坐标 
float 
m 
 
Roll/Pitch/Yaw 机器人在地图坐标系[8]下的姿态角度 
float 
m 
 
1.4.3 获取导航中的感知软件状态信息 
用户可通过该请求获取机器人导航中的感知软件状态信息。 


| 4 | "Command": 2, |
| --- | --- |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Location":1, |
| 8 | "PosX":0.0, |
| 9 | "PosY":0.0, |
| 10 | "PosZ":0.0, |
| 11 | "Roll":0.0, |
| 12 | "Pitch":0.0, |
| 13 | "Yaw":0.0 |
| 14 | } |
| 15 | } |
| 16 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1007</Type> |
| 4 | <Command>2</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <Location>1</Location> |
| 8 | <PosX>0.0</PosX> |
| 9 | <PosY>0.0</PosY> |
| 10 | <PosZ>0.0</PosZ> |
| 11 | <Roll>0.0</Roll> |
| 12 | <Pitch>0.0</Pitch> |
| 13 | <Yaw>0.0</Yaw> |
| 14 | </Items> |
| 15 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Location | 定位状态 | int | / | 定位正常 = 0
定位丢失 = 1 |
| PosX/PosY/PosZ | 机器人在地图坐标系[8]下的坐标 | float | m |  |
| Roll/Pitch/Yaw | 机器人在地图坐标系[8]下的姿态角度 | float | m |  |


---
## 第 36 页
---

DEEP Robotics 
 36 / 57 
Type字段值 
Command字段值 
消息类型 
2002 
1 
获取导航中的感知软件状态信息 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2002, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>2002</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
响应 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
{ 
 
"PatrolDevice": { 
 
 
"Type": 2002, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
 
"Location":1, 
 
 
 
"ObsState":0.0 
 
} 
 
} 
} 
XML 格式响应： 


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 2002 | 1 | 获取导航中的感知软件状态信息 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2002, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2002</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | </Items> |
| 8 | </PatrolDevice> |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 2002, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Location":1, |
| 8 | "ObsState":0.0 |
| 9 | } |
| 10 | } |
| 11 | } |


---
## 第 37 页
---

DEEP Robotics 
 37 / 57 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>2002</Type> 
 
<Command>1</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<Location>1</Location> 
 
 
<ObsState>0.0</ObsState> 
</Items> 
</PatrolDevice> 
Items 字段中的参数项含义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
Location 
定位状态 
int 
/ 
定位正常 =  0 
定位丢失 = 1 
ObsState 
是否处于避障状态 
int 
/ 
无障碍物，未处于避障状态 =  0 
有障碍物，处于避障状态 = 1 
1.4.4 下发单点导航任务 
用户可通过该请求下发导航任务，即前往一个目标点并在目标点执行用户设置的任务。 
Type字段值 
Command字段值 
消息类型 
1003 
1 
下发导航任务 
 
【注意】机器人收到该请求后，将会先执行用户下发的导航任务（成功/失败/取消），然
后才会发送携带执行结果的响应消息给客户端。 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1003, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
             "Value": 0, 
             "MapID": 0, 
             "PosX": 0, 
             "PosY": 0, 


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>2002</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <Location>1</Location> |
| 8 | <ObsState>0.0</ObsState> |
| 9 | </Items> |
| 10 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Location | 定位状态 | int | / | 定位正常 = 0
定位丢失 = 1 |
| ObsState | 是否处于避障状态 | int | / | 无障碍物，未处于避障状态 = 0
有障碍物，处于避障状态 = 1 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1003 | 1 | 下发导航任务 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1003, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Value": 0, |
| 8 | "MapID": 0, |
| 9 | "PosX": 0, |
| 10 | "PosY": 0, |


---
## 第 38 页
---

DEEP Robotics 
 38 / 57 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
             "PosZ": 0, 
             "AngleYaw": 0, 
             "PointInfo": 0, 
             "Gait": 0, 
             "Speed": 0, 
             "Manner": 0, 
             "ObsMode": 0, 
             "NavMode": 0 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1003</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items> 
 
 
<Value>0</Value>   
 
 
<MapID>0</MapID>   
 
 
<PosX>0.0</PosX>   
 
 
<PosY>0.0</PosY>   
 
 
<PosZ>0.0</PosZ>   
 
 
<AngleYaw>0.0</AngleYaw>   
 
 
<PointInfo>0</PointInfo>   
 
 
<Gait>0</Gait>   
 
 
<Speed>0</Speed>   
 
 
<Manner>0</Manner>   
 
 
<ObsMode>0</ObsMode>   
 
 
<NavMode>0</NavMode>   
 
</Items> 
</PatrolDevice> 
该请求消息中，Items 字段包含多个参数项。 
【注意】导航任务参数项，按照类型分为点属性参数项和路径属性参数项。点属性是定义
导航目标点的属性，包括目标点编号Value、类型PointInfo、位置PosX/PosY/PosZ、朝
向AngleYaw；路径属性是在前往导航目标点的路径中生效的属性，用于规定机器狗应该如
何从当前位置走到目标点，包括到达目标点的过程中使用的步态Gait、速度Speed、运动
朝向Manner、导航方式NavMode，以及到达目标点过程中是否开启停避障ObsMode。 


| 11 | "PosZ": 0, |
| --- | --- |
| 12 | "AngleYaw": 0, |
| 13 | "PointInfo": 0, |
| 14 | "Gait": 0, |
| 15 | "Speed": 0, |
| 16 | "Manner": 0, |
| 17 | "ObsMode": 0, |
| 18 | "NavMode": 0 |
| 19 | } |
| 20 | } |
| 21 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1003</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items> |
| 7 | <Value>0</Value> |
| 8 | <MapID>0</MapID> |
| 9 | <PosX>0.0</PosX> |
| 10 | <PosY>0.0</PosY> |
| 11 | <PosZ>0.0</PosZ> |
| 12 | <AngleYaw>0.0</AngleYaw> |
| 13 | <PointInfo>0</PointInfo> |
| 14 | <Gait>0</Gait> |
| 15 | <Speed>0</Speed> |
| 16 | <Manner>0</Manner> |
| 17 | <ObsMode>0</ObsMode> |
| 18 | <NavMode>0</NavMode> |
| 19 | </Items> |
| 20 | </PatrolDevice> |


---
## 第 39 页
---

DEEP Robotics 
 39 / 57 
各参数项具体定义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
Value 
导航任务目标点编号 
int 
/ 
 
MapID 
目标点所在栅格地图编号 
int 
/ 
暂无意义 
PosX/PosY/PosZ
目标点在地图坐标系中的位置坐标 
float 
m 
 
AngleYaw 
目标点在地图坐标系中的朝向 
float 
rad 
 
PointInfo 
目标点类型[9] 
int 
/ 
过渡点=0 
任务点=1 
充电点=3 
Gait 
到达目标点的过程中使用的步态[10] 
int 
/ 
平地（敏捷运动模式）=12 
楼梯（敏捷运动模式）=13 
Speed 
到达目标点的过程中使用的速度 
int 
/ 
正常=0 
低速=1 
高速=2 
Manner 
到达目标点的过程中使用的运动方式 
int 
/ 
前进行走=0 
倒退行走=1 
ObsMode 
到达目标点的过程中是否开启导航模块停避
障功能[11] 
int 
/ 
开启=0 
关闭=1 
NavMode 
到达目标点的过程中使用的导航方式[12] 
int 
/ 
直线导航=0 
自主导航=1 
[9]目标点分为过渡点、任务点、充电点三种类型： 
a) 过渡点：仅用于克服地形和约束路径，到点精度较低； 
b) 任务点：到点精度较高，机器狗到达任务点后，会停止运动，保持原地站立以便执行识
别表计等巡检任务，直至收到下一个目标点请求； 
c) 充电点：在充电桩前用于识别定位充电桩反光柱，机器人到达充电点后，将自动进入充
电桩进行充电，它将保持充电状态直至收到下一个目标点请求。 
[10]导航可执行的步态中： 
a) 平地步态：适用于水泥地等平整地面； 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Value | 导航任务目标点编号 | int | / |  |
| MapID | 目标点所在栅格地图编号 | int | / | 暂无意义 |
| PosX/PosY/PosZ | 目标点在地图坐标系中的位置坐标 | float | m |  |
| AngleYaw | 目标点在地图坐标系中的朝向 | float | rad |  |
| PointInfo | 目标点类型[9] | int | / | 过渡点=0
任务点=1
充电点=3 |
| Gait | 到达目标点的过程中使用的步态[10] | int | / | 平地（敏捷运动模式）=12
楼梯（敏捷运动模式）=13 |
| Speed | 到达目标点的过程中使用的速度 | int | / | 正常=0
低速=1
高速=2 |
| Manner | 到达目标点的过程中使用的运动方式 | int | / | 前进行走=0
倒退行走=1 |
| ObsMode | 到达目标点的过程中是否开启导航模块停避
障功能[11] | int | / | 开启=0
关闭=1 |
| NavMode | 到达目标点的过程中使用的导航方式[12] | int | / | 直线导航=0
自主导航=1 |


---
## 第 40 页
---

DEEP Robotics 
 40 / 57 
b) 楼梯步态：适用于通过斜坡（≤30°）和楼梯（≤22cm）等障碍地形的步态，不建议使
用该步态的高速模式。 
[11]无论导航模块的停避障功能是否开启，地形图的停避障功能作为机器狗自身的安全模块
将会始终保持开启。当导航的停避障功能开启时，对于直线导航，该功能表现为停障，对于
自主导航，该功能表现为避障。 
[12]使用直线导航时，若两点间无法以直线的方式进行全局规划，会返回导航任务执行失败；
使用自主导航时，应根据地形复杂度设置路径点，地形复杂度越高，导航路径执行的风险越
高，则应当设置更密集的路径点；尽量使用多段直线导航代替自主导航。 
 
【注意】使用直线导航方式控制机器人攀爬楼梯时，建议将目标点位标到距离最后一阶楼
梯边缘45cm 以外，同时需要关闭导航的停避障功能。 
【注意】使用自主导航方式时，仅支持使用平地步态与低速模式。 
响应 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1003, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
"Value":0, 
 
 
 
"Status":0, 
 
 
 
"ErrorCode":0 
 
 
} 
 
} 


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1003, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Value":0, |
| 8 | "Status":0, |
| 9 | "ErrorCode":0 |
| 10 | } |
| 11 | } |


---
## 第 41 页
---

DEEP Robotics 
 41 / 57 
12 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1003</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<Value>0</Value> 
 
 
<Status>0</Status> 
 
 
<ErrorCode>0</ErrorCode> 
 
</Items> 
</PatrolDevice> 
该响应消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 
单位 
参数值说明
Value 
导航任务目标点编号 
int 
/ 
与下发导航任务请求对应 
Status 
导航任务执行状态 
int 
/ 
空闲=0 
退出充电桩中=1 
导航预处理=2 
 导航中=3 
导航完成=4 
进入充电桩中=5 
暂停中=0xff 
ErrorCode 
错误码 
int 
/ 
详见错误码表 
ErrorCode 的值对应的含义如下表所示： 
参数值 
含义 
参数值 
含义 
0 
异常码默认值 
41768 
切换导航模式失败 
8960 
单点巡检任务执行完成 
41793 
当前正在执行任务，下发新任务失败 
8962 
单点巡检任务被取消 
41795 
退出自主充电执行失败 
41729 
运动状态异常，任务失败(软急停、摔倒) 
41803 
持续停障异常，导航失败 
41730 
电量过低，任务失败 
41804 
导航全局规划失败 
41731 
电机过温异常，任务失败 
41805 
持续导航速度未刷新，导航失败 
41746 
导航模块通讯异常，无法下发任务 
41806 
自主充电流程中，下发任务失败 


| 12 | } |
| --- | --- |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1003</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <Value>0</Value> |
| 8 | <Status>0</Status> |
| 9 | <ErrorCode>0</ErrorCode> |
| 10 | </Items> |
| 11 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Value | 导航任务目标点编号 | int | / | 与下发导航任务请求对应 |
| Status | 导航任务执行状态 | int | / | 空闲=0
退出充电桩中=1
导航预处理=2
导航中=3
导航完成=4
进入充电桩中=5
暂停中=0xff |
| ErrorCode | 错误码 | int | / | 详见错误码表 |


|  |  |  |  |
| --- | --- | --- | --- |
| 参数值 | 含义 | 参数值 | 含义 |
|  |  |  |  |
|  | 异常码默认值 |  | 切换导航模式失败 |
| 0 |  | 41768 |  |
|  |  |  |  |
|  | 单点巡检任务执行完成 |  | 当前正在执行任务，下发新任务失败 |
| 8960 |  | 41793 |  |
|  |  |  |  |
|  | 单点巡检任务被取消 |  | 退出自主充电执行失败 |
| 8962 |  | 41795 |  |
|  |  |  |  |
|  | 运动状态异常，任务失败(软急停、摔倒) |  | 持续停障异常，导航失败 |
| 41729 |  | 41803 |  |
|  |  |  |  |
|  | 电量过低，任务失败 |  | 导航全局规划失败 |
| 41730 |  | 41804 |  |
|  |  |  |  |
|  | 电机过温异常，任务失败 |  | 持续导航速度未刷新，导航失败 |
| 41731 |  | 41805 |  |
|  |  |  |  |
|  | 导航模块通讯异常，无法下发任务 |  | 自主充电流程中，下发任务失败 |
| 41746 |  | 41806 |  |
|  |  |  |  |


---
## 第 42 页
---

DEEP Robotics 
 42 / 57 
参数值 
含义 
参数值 
含义 
41747 
定位状态持续异常(超过30s) 
 
 
1.4.5 取消导航任务 
用户可通过该请求取消正在执行的导航任务，即使其终止。 
Type字段值 
Command字段值 
消息类型 
1004 
1 
取消导航任务 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1004, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
3 
4 
5 
6 
7 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1004</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items/> 
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
响应 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1004, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 


|  |  |  |  |
| --- | --- | --- | --- |
| 参数值 | 含义 | 参数值 | 含义 |
|  |  |  |  |
|  | 定位状态持续异常(超过30s) |  |  |
| 41747 |  |  |  |
|  |  |  |  |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1004 | 1 | 取消导航任务 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1004, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1004</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items/> |
| 7 | </PatrolDevice> |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1004, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |


---
## 第 43 页
---

DEEP Robotics 
 43 / 57 
7 
8 
9 
10 
 
 
 
"ErrorCode":0 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice> 
 
<Type>1004</Type> 
 
<Command>1</Command> 
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<ErrorCode>1</ErrorCode> 
</Items> 
</PatrolDevice> 
Items 字段中的参数项含义如下： 
参数项 
含义 
数据类型 单位 
参数值说明 
ErrorCode 
执行取消导航任务的结果 
int 
/ 
取消成功 = 0，取消失败 = 1 
1.4.6 查询导航任务执行状态 
用户可通过该请求查询导航任务执行状态。 
Type字段值 
Command字段值 
消息类型 
1007 
1 
查询导航任务执行状态 
请求 
JSON 格式请求： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1007, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
} 
 
} 
} 
XML 格式请求： 
1 
2 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   


| 7 | "ErrorCode":0 |
| --- | --- |
| 8 | } |
| 9 | } |
| 10 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1004</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <ErrorCode>1</ErrorCode> |
| 8 | </Items> |
| 9 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| ErrorCode | 执行取消导航任务的结果 | int | / | 取消成功 = 0，取消失败 = 1 |


|  |  |  |
| --- | --- | --- |
| Type字段值 | Command字段值 | 消息类型 |
|  |  |  |
| 1007 | 1 | 查询导航任务执行状态 |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1007, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | } |
| 8 | } |
| 9 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |


---
## 第 44 页
---

DEEP Robotics 
 44 / 57 
3 
4 
5 
6 
7 
 
<Type>1007</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:00</Time> 
 
<Items/>   
</PatrolDevice> 
该请求消息中，Items 字段不包含任何参数项。 
响应 
JSON 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
{ 
 
"PatrolDevice": { 
 
 
"Type": 1007, 
 
 
"Command": 1, 
 
 
"Time": "2023-01-01 00:00:00", 
 
 
"Items": { 
 
 
"Value":0, 
 
 
 
"Status":0, 
 
 
 
"ErrorCode":0 
 
 
} 
 
} 
} 
XML 格式响应： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
<?xml version="1.0" encoding="UTF-8"?> 
<PatrolDevice>   
 
<Type>1007</Type> 
 
<Command>1</Command>   
 
<Time>2023-01-01 00:00:01</Time> 
 
<Items> 
 
 
<Value>0</Value> 
 
 
<Status>0</Status> 
 
 
<ErrorCode>0</ErrorCode> 
 
</Items> 
</PatrolDevice> 
该响应消息中，Items 字段包含以下参数项： 
参数项 
含义 
数据类型 
单位 
参数值说明
Value 
导航任务目标点编号 
int 
/ 
与下发导航任务请求对应 
Status 
导航任务执行状态 
int 
/ 
空闲=0 
退出充电桩中=1 


| 3 | <Type>1007</Type> |
| --- | --- |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:00</Time> |
| 6 | <Items/> |
| 7 | </PatrolDevice> |


| 1 | { |
| --- | --- |
| 2 | "PatrolDevice": { |
| 3 | "Type": 1007, |
| 4 | "Command": 1, |
| 5 | "Time": "2023-01-01 00:00:00", |
| 6 | "Items": { |
| 7 | "Value":0, |
| 8 | "Status":0, |
| 9 | "ErrorCode":0 |
| 10 | } |
| 11 | } |
| 12 | } |


| 1 | <?xml version="1.0" encoding="UTF-8"?> |
| --- | --- |
| 2 | <PatrolDevice> |
| 3 | <Type>1007</Type> |
| 4 | <Command>1</Command> |
| 5 | <Time>2023-01-01 00:00:01</Time> |
| 6 | <Items> |
| 7 | <Value>0</Value> |
| 8 | <Status>0</Status> |
| 9 | <ErrorCode>0</ErrorCode> |
| 10 | </Items> |
| 11 | </PatrolDevice> |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| Value | 导航任务目标点编号 | int | / | 与下发导航任务请求对应 |
| Status | 导航任务执行状态 | int | / | 空闲=0
退出充电桩中=1 |


---
## 第 45 页
---

DEEP Robotics 
 45 / 57 
参数项 
含义 
数据类型 
单位 
参数值说明
导航预处理=2 
 导航中=3 
导航完成=4 
进入充电桩中=5 
暂停中=0xff 
ErrorCode 
错误码 
int 
/ 
详见错误码表 
ErrorCode 的值对应的含义如下表所示： 
参数值 
含义 
参数值 
含义 
0 
异常码默认值 
41768 
切换导航模式失败 
8960 
单点巡检任务执行完成 
41793 
当前正在执行任务，下发新任务失败 
8962 
单点巡检任务被取消 
41795 
退出自主充电执行失败 
41729 
运动状态异常，任务失败(软急停、摔倒) 
41803 
持续停障异常，导航失败 
41730 
电量过低，任务失败 
41804 
导航全局规划失败 
41731 
电机过温异常，任务失败 
41805 
持续导航速度未刷新，导航失败 
41746 
导航模块通讯异常，无法下发任务 
41806 
自主充电流程中，下发任务失败 
41747 
定位状态持续异常(超过30s) 
 
 
 
【注意】若查询发现导航任务无法执行，请检查导航程序是否未启动或存在异常。 


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
|  |  |  |  | 导航预处理=2
导航中=3
导航完成=4
进入充电桩中=5
暂停中=0xff |
| ErrorCode | 错误码 | int | / | 详见错误码表 |


|  |  |  |  |
| --- | --- | --- | --- |
| 参数值 | 含义 | 参数值 | 含义 |
|  |  |  |  |
|  | 异常码默认值 |  | 切换导航模式失败 |
| 0 |  | 41768 |  |
|  |  |  |  |
|  | 单点巡检任务执行完成 |  | 当前正在执行任务，下发新任务失败 |
| 8960 |  | 41793 |  |
|  |  |  |  |
|  | 单点巡检任务被取消 |  | 退出自主充电执行失败 |
| 8962 |  | 41795 |  |
|  |  |  |  |
|  | 运动状态异常，任务失败(软急停、摔倒) |  | 持续停障异常，导航失败 |
| 41729 |  | 41803 |  |
|  |  |  |  |
|  | 电量过低，任务失败 |  | 导航全局规划失败 |
| 41730 |  | 41804 |  |
|  |  |  |  |
|  | 电机过温异常，任务失败 |  | 持续导航速度未刷新，导航失败 |
| 41731 |  | 41805 |  |
|  |  |  |  |
|  | 导航模块通讯异常，无法下发任务 |  | 自主充电流程中，下发任务失败 |
| 41746 |  | 41806 |  |
|  |  |  |  |
|  | 定位状态持续异常(超过30s) |  |  |
| 41747 |  |  |  |
|  |  |  |  |


---
## 第 46 页
---

DEEP Robotics 
 46 / 57 
2 DDS 话题 
本节介绍山猫M20 机器人的DDS 话题，部分话题采用ROS2 的标准消息类型。 
【注意】使用ROS2 工具接收话题、查看频率等前，需要source/opt/ros/foxy/setup.bas
h 环境变量。 
2.1 传感器驱动话题 
该节的话题均为开机后即有消息发布，开发者可订阅话题消息，以获取传感器数据。 
话题名 
描述 
消息类型 
频率 
/IMU_YESENSE 
通用格式imu数据话题 
sensor_msgs/msg/Imu 
200Hz 
/LIDAR/POINTS 
通用格式点云数据话题 
sensor_msgs/msg/PointCloud2 
10Hz 
 
【注意】/LIDAR/POINTS 话题依赖于rsdriver_node 服务，若话题无数据，可参考附录2
查看服务的存活状态，并开启、关闭相应服务。 
【注意】激光雷达和IMU 数据的发布被限制于仅主机传输，如需通过ROS2 接收相关数据，
需要su 切换到root 用户下，source /opt/ros/foxy/setup.bash 环境变量后，设置ROS2 
仅主机传输环境变量export ROS_LOCALHOST_ONLY=1 即可查看。 
【注意】目前尚未支持在GOS 主机（104 主机）上获取激光雷达数据。 
2.2 高度图相关话题 
2.2.1 获取障碍物点云 
该话题在开机后即有消息发布，开发者可订阅话题消息，以获取障碍物点云数据。 
话题名 
描述 
消息类型 
/cloud_nav 
通用格式点云数据话题 
sensor_msgs/msg/PointCloud2 
2.2.2 获取环视深度图 
该话题在开机后即有消息发布，开发者可订阅话题消息，以获取环视深度图数据。 


|  |  |  |  |
| --- | --- | --- | --- |
| 话题名 | 描述 | 消息类型 | 频率 |
|  |  |  |  |
| /IMU_YESENSE | 通用格式imu数据话题 | sensor_msgs/msg/Imu | 200Hz |
| /LIDAR/POINTS | 通用格式点云数据话题 | sensor_msgs/msg/PointCloud2 | 10Hz |


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /cloud_nav | 通用格式点云数据话题 | sensor_msgs/msg/PointCloud2 |


---
## 第 47 页
---

DEEP Robotics 
 47 / 57 
话题名 
描述 
消息类型 
/DEPTH_IMAGE 
通用格式图像数据话题 
sensor_msgs::msg::Image 
2.3 运动相关话题 
【注意】本节话题依赖于rl_deploy 服务，若话题消息下发无响应或收不到话题消息，可
参考附录2 查看服务的存活状态，并开启、关闭相应服务。 
2.3.1 运动状态转换 
该话题在运动程序启动后激活，开发者可在该话题中发布消息，以转换机器人运动状态。 
话题名 
描述 
消息类型 
/MOTION_STATE 
运动状态[1]转换指令 
drdds/msg/MotionState 
话题/MOTION_STATE 的消息类型/drdds/msg/MotionState 是自定义消息类型，包含
drdds::msg::MetaType 和drdds::msg::MotionStateValue： 
1 
2 
3 
4 
5 
6 
7 
MetaType header 
 
uint64 frame_id 
 
Timestamp timestamp 
 
 
int32 sec 
 
 
uint32 nsec 
MotionStateValue data 
 
uintt32 state 
设置不同的运动状态对应需要发布的话题消息字段state 如下表所示： 
需要设置的运动状态 
应发布的字段值 
空闲 
0 
站立 
1 
关节阻尼/软急停 
2 
开机阻尼 
3 
趴下 
4 
标准运动模式 
6 
敏捷运动模式 
8 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /DEPTH_IMAGE | 通用格式图像数据话题 | sensor_msgs::msg::Image |


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /MOTION_STATE | 运动状态[1]转换指令 | drdds/msg/MotionState |


| 1 | MetaType header |
| --- | --- |
| 2 | uint64 frame id
_ |
| 3 | Timestamp timestamp |
| 4 | int32 sec |
| 5 | uint32 nsec |
| 6 | MotionStateValue data |
| 7 | uintt32 state |


|  |  |
| --- | --- |
| 需要设置的运动状态 | 应发布的字段值 |
|  |  |
| 空闲 | 0 |
| 站立 | 1 |
| 关节阻尼/软急停 | 2 |
| 开机阻尼 | 3 |
| 趴下 | 4 |
| 标准运动模式 | 6 |
| 敏捷运动模式 | 8 |


---
## 第 48 页
---

DEEP Robotics 
 48 / 57 
2.3.2 运控步态切换 
该话题在运动程序启动后激活，开发者可在该话题中发布消息，以切换运控步态。 
话题名 
描述 
消息类型 
/GAIT 
运控步态切换指令 
drdds/msg/Gait 
话题/GAIT 的消息类型drdds/msg/Gait 是自定义消息类型，包含 drdds::msg::MetaType 和
drdds::msg::GaitValue : 
1 
2 
3 
4 
5 
6 
7 
MetaType header 
 
uint64 frame_id 
 
Timestamp timestamp 
 
 
int32 sec 
 
 
uint32 nsec 
SteerValue data 
 
uintt32 gait 
设置不同的运动状态对应需要发布的话题消息字段gait 如下表所示： 
需要设置的运动状态 
应发布的字段值 
平地步态（敏捷运动模式） 
12 
楼梯步态（敏捷运动模式） 
13 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 
2.3.3 获取运动基本状态和步态 
该话题在开机后即有消息发布，开发者可订阅话题消息，以获取运动基本状态和步态。 
话题名 
描述 
消息类型 
频率 
/MOTION_INFO 
机器人的运动基本状态和步态  
drdds/msg/MotionInfo 
20Hz 
话题/MOTION_INFO 的消息类型drdds/msg/MotionInfo 是自定义消息类型，包含 
drdds::msg::MetaType 和drdds::msg::MotionInfoValue: 
1 
2 
3 
4 
5 
6 
MetaType header 
 
uint64 frame_id 
 
Timestamp timestamp 
 
 
int32 sec 
 
 
uint32 nsec 
MotionInfoValue data 


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /GAIT | 运控步态切换指令 | drdds/msg/Gait |


| 1 | MetaType header |
| --- | --- |
| 2 | uint64 frame id
_ |
| 3 | Timestamp timestamp |
| 4 | int32 sec |
| 5 | uint32 nsec |
| 6 | SteerValue data |
| 7 | uintt32 gait |


|  |  |
| --- | --- |
| 需要设置的运动状态 | 应发布的字段值 |
|  |  |
| 平地步态（敏捷运动模式） | 12 |
| 楼梯步态（敏捷运动模式） | 13 |


|  |  |  |  |
| --- | --- | --- | --- |
| 话题名 | 描述 | 消息类型 | 频率 |
|  |  |  |  |
| /MOTION_INFO | 机器人的运动基本状态和步态 | drdds/msg/MotionInfo | 20Hz |


| 1 | MetaType header |
| --- | --- |
| 2 | uint64 frame id
_ |
| 3 | Timestamp timestamp |
| 4 | int32 sec |
| 5 | uint32 nsec |
| 6 | MotionInfoValue data |


---
## 第 49 页
---

DEEP Robotics 
 49 / 57 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
 
float32 vel_x 
 
float32 vel_y 
 
float32 vel_yaw 
 
float32 height 
 
MotionStateValue motion_state 
 
MetaType header 
 
MotionStateValue data 
 
 
int32 state 
 
GaitValue gait_state 
 
 
MetaType header 
 
 
GaitValue data 
 
 
 
uint32 gait 
 
 
float32 payload 
 
 
float32 remain_mile 
消息内容对应的字段具体定义如下表所示： 
参数项 
含义 
数据类型 
单位 
参数值说明 
vel_x 
前后方向运动速度 
float32 
m/s 
正、负值分别表示前进、后退速度 
vel_y 
左右方向运动速度 
float32 
m/s 
正、负值分别表示左移、右移速度 
vel_yaw 
水平转向速度 
float32 
rad/s 正、负值分别表示逆时针、顺时针旋
转速度 
height 
当前机身高度 
float32 
m 
 
state 
运动状态 
int32 
/ 
空闲=0 
站立=1 
关节阻尼/软急停=2 
开机阻尼=3 
趴下=4 
标准运动模式=6 
敏捷运动模式=8 
gait 
步态 
uint32 
/ 
基础（标准运动模式）= 1 
平地（敏捷运动模式）= 12 
楼梯（敏捷运动模式）= 13 
楼梯（标准运动模式）= 14 
payload 
无效参数 
/ 
/ 
 
remain_mile 
预计剩余续航里程 
float32 
km 
 
 


| 7 | float32 vel x
_ |
| --- | --- |
| 8 | float32 vel y
_ |
| 9 | float32 vel yaw
_ |
| 10 | float32 height |
| 11 | MotionStateValue motion state
_ |
| 12 | MetaType header |
| 13 | MotionStateValue data |
| 14 | int32 state |
| 15 | GaitValue gait state
_ |
| 16 | MetaType header |
| 17 | GaitValue data |
| 18 | uint32 gait |
| 19 | float32 payload |
| 20 | float32 remain mile
_ |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| vel_x | 前后方向运动速度 | float32 | m/s | 正、负值分别表示前进、后退速度 |
| vel_y | 左右方向运动速度 | float32 | m/s | 正、负值分别表示左移、右移速度 |
| vel_yaw | 水平转向速度 | float32 | rad/s | 正、负值分别表示逆时针、顺时针旋
转速度 |
| height | 当前机身高度 | float32 | m |  |
| state | 运动状态 | int32 | / | 空闲=0
站立=1
关节阻尼/软急停=2
开机阻尼=3
趴下=4
标准运动模式=6
敏捷运动模式=8 |
| gait | 步态 | uint32 | / | 基础（标准运动模式）= 1
平地（敏捷运动模式）= 12
楼梯（敏捷运动模式）= 13
楼梯（标准运动模式）= 14 |
| payload | 无效参数 | / | / |  |
| remain_mile | 预计剩余续航里程 | float32 | km |  |


---
## 第 50 页
---

DEEP Robotics 
 50 / 57 
【注意】标准运动模式适用于手动控制；敏捷运动模式下的步态速度响应性能较好，适用
于导航等自主算法开发。 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 
2.4 自主充电相关话题 
【注意】使用本节话题时，请勿通过其他上层应用同时使用自主充电功能，否则可能产生
冲突。同时，本节话题依赖于charge_manager 服务，若话题消息下发无响应或收不到话题
消息，可参考附录2 查看服务的存活状态，并开启、关闭相应服务。 
2.4.1 下发自主充电指令 
开发者可在该话题中发布消息，以下发自主充电指令。 
话题名 
描述 
消息类型 
/CHARGE 
下发充电指令 
drdds/msg/StdMsgInt32 
话题/CHARGE 采用自定义消息类型，包含drdds/msg/StdMsgInt32 : 
1 
int32 value 
字段value 对应的充电指令如下表所示： 
字段值 
字段值含义 
0 
请求结束充电 
1 
请求开始充电 
2 
清除充电状态，恢复到空闲状态 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 
2.4.2 获取自主充电状态 
该话题在开机后即有消息发布，开发者可订阅话题消息，以获机器人的取自主充电状态。 
话题名 
描述 
消息类型 
频率 
/CHARGE_STATUS 
获取自主充电状态 
drdds/msg/StdStatus 
1Hz 
话题/CHARGE_STATUS 是自定义消息类型，包含 drdds/msg/StdStatus : 


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /CHARGE | 下发充电指令 | drdds/msg/StdMsgInt32 |


| 1 | int32 value |
| --- | --- |


|  |  |
| --- | --- |
| 字段值 | 字段值含义 |
|  |  |
| 0 | 请求结束充电 |
| 1 | 请求开始充电 |
| 2 | 清除充电状态，恢复到空闲状态 |


|  |  |  |  |
| --- | --- | --- | --- |
| 话题名 | 描述 | 消息类型 | 频率 |
|  |  |  |  |
| /CHARGE_STATUS | 获取自主充电状态 | drdds/msg/StdStatus | 1Hz |


---
## 第 51 页
---

DEEP Robotics 
 51 / 57 
1 
2 
int32 state 
uint32 error_code 
话题/CHARGE_STATUS 的消息内容中的字段对应的自主充电状态如下表所示： 
字段 
含义 
数据类型 
字段值 
对应的自主充电状态 
对应的异常状态 
state 
自主充电状态 
int32 
0 
空闲 
/ 
1 
前往充电桩过程中 
/ 
2 
充电中 
/ 
3 
退出充电桩过程中 
/ 
4 
机器人异常 
0x1002~0x1008 
5 
在桩上但无电流 
0x1007 
error_code 
异常状态 
uint32 
0 
空闲 
重置操作/初始化 
1 
空闲 / 充电中 
操作成功 
4098 
（0x1002） 
机器人异常 
寻找充电桩目标点超时
（反光柱遮挡超时） 
4099 
（0x1003） 
机器人异常 
开启反光柱定位算法失败 
4100 
（0x1004） 
机器人异常 
寻找充电桩目标点失败
（无反光柱目标点） 
4101 
（0x1005） 
机器人异常 
进桩超时 
4102 
（0x1006） 
机器人异常 
退桩超时 
4103 
（0x1007） 
机器人异常 
充电桩无电流 
4104 
（0x1008） 
机器人异常 
发生软急停 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 
2.5 速度相关话题 
2.5.1 获取或下发导航速度指令 
【注意】 发布该话题时，可能会与机器人自带的planner 服务、charge_manager 服务产
生冲突，请在参考附录2 关闭planner 和charge_manager 服务。同时，该话题依赖basic
_server 服务，若速度指令无响应，请参考附录2 查看服务的存活状态，并开启、关闭相
应服务。 


| 1 | int32 state |
| --- | --- |
| 2 | uint32 error code
_ |


|  |  |  |  |  |  |
| --- | --- | --- | --- | --- | --- |
| 字段 | 含义 | 数据类型 | 字段值 | 对应的自主充电状态 | 对应的异常状态 |
|  |  |  |  |  |  |
| state | 自主充电状态 | int32 | 0 | 空闲 | / |
|  |  |  | 1 | 前往充电桩过程中 | / |
|  |  |  | 2 | 充电中 | / |
|  |  |  | 3 | 退出充电桩过程中 | / |
|  |  |  | 4 | 机器人异常 | 0x1002~0x1008 |
|  |  |  | 5 | 在桩上但无电流 | 0x1007 |
| error_code | 异常状态 | uint32 | 0 | 空闲 | 重置操作/初始化 |
|  |  |  | 1 | 空闲 / 充电中 | 操作成功 |
|  |  |  | 4098
（0x1002） | 机器人异常 | 寻找充电桩目标点超时
（反光柱遮挡超时） |
|  |  |  | 4099
（0x1003） | 机器人异常 | 开启反光柱定位算法失败 |
|  |  |  | 4100
（0x1004） | 机器人异常 | 寻找充电桩目标点失败
（无反光柱目标点） |
|  |  |  | 4101
（0x1005） | 机器人异常 | 进桩超时 |
|  |  |  | 4102
（0x1006） | 机器人异常 | 退桩超时 |
|  |  |  | 4103
（0x1007） | 机器人异常 | 充电桩无电流 |
|  |  |  | 4104
（0x1008） | 机器人异常 | 发生软急停 |


---
## 第 52 页
---

DEEP Robotics 
 52 / 57 
【注意】 该速度话题仅在导航模式下生效。 
【注意】 开发过程中，如无需使用机器人自带的定位服务，可参考附录2 关闭localizat
ion 服务以节省资源。 
开发者可通过发布该话题来下发导航规划的速度指令，以控制机器人移动；也可订阅话题消
息，以获机器人本身导航功能下发的速度指令。 
话题名 
描述 
消息类型 
/NAV_CMD 
获取或下发导航规划的速度指令 
drdds::msg::NavCmd 
话题/NAV_CMD 的消息类型
drdds/msg/NavCmd 采用自定义消息类型，包含
drdds::msg::MetaType 和drdds::msg::NavCmdValue： 
1 
2 
3 
4 
5 
6 
7 
8 
9 
MetaType header 
 
uint64 frame_id 
 
Timestamp timestamp 
 
 
int32 sec 
 
 
uint32 nsec 
NavCmdValue data 
 
float32 x_vel      
 
float32 y_vel     
 
float32 yaw_vel   
消息内容对应的字段含义如下表所示： 
参数项 
含义 
数据类型 
单位 
参数值说明 
x_vel 
前后方向运动速度 
float32 
m/s 
正、负值分别表示前进、后退速度
y_vel 
左右方向运动速度 
float32 
m/s 
正、负值分别表示左移、右移速度
yaw-vel 
偏航角速度 
float32 
rad/s 
正、负值分别表示逆时针、顺时针旋转速度
机器人的移动、旋转正方向请参考下图： 


|  |  |  |
| --- | --- | --- |
| 话题名 | 描述 | 消息类型 |
|  |  |  |
| /NAV_CMD | 获取或下发导航规划的速度指令 | drdds::msg::NavCmd |


| 1 | MetaType header |
| --- | --- |
| 2 | uint64 frame id
_ |
| 3 | Timestamp timestamp |
| 4 | int32 sec |
| 5 | uint32 nsec |
| 6 | NavCmdValue data |
| 7 | float32 x vel
_ |
| 8 | float32 y vel
_ |
| 9 | float32 yaw vel
_ |


|  |  |  |  |  |
| --- | --- | --- | --- | --- |
| 参数项 | 含义 | 数据类型 | 单位 | 参数值说明 |
|  |  |  |  |  |
| x_vel | 前后方向运动速度 | float32 | m/s | 正、负值分别表示前进、后退速度 |
| y_vel | 左右方向运动速度 | float32 | m/s | 正、负值分别表示左移、右移速度 |
| yaw-vel | 偏航角速度 | float32 | rad/s | 正、负值分别表示逆时针、顺时针旋转速度 |


---
## 第 53 页
---

DEEP Robotics 
 53 / 57 
 
开发者如需在自己的程序中订阅该话题，需要在程序中定义该自定义消息的结构。 
 


---
## 第 54 页
---

DEEP Robotics 
 54 / 57 
附录1 UDP 示例代码 
1 
2 
3 
4 
5 
6 
7 
8 
9 
10 
11 
12 
13 
14 
15 
16 
17 
18 
19 
20 
21 
22 
23 
24 
25 
26 
27 
28 
29 
30 
31 
32 
33 
34 
35 
36 
37 
38 
39 
40 
#include <iostream> 
#include <cstring> 
#include <sys/socket.h> 
#include <arpa/inet.h> 
#include <unistd.h> 
 
#define SERVER_IP "10.21.31.103" 
#define PORT 30000 
#define BUFFER_SIZE 1024 
 
struct udpMessage 
{ 
    unsigned char header[16]; 
    unsigned char data[BUFFER_SIZE]; 
}; 
 
 
int main() { 
    // 创建 UDP 套接字 
    int client_fd = socket(AF_INET, SOCK_DGRAM, 0); 
    if (client_fd < 0) { 
        perror("socket creation failed"); 
        return -1; 
    } 
 
    // 配置服务器地址 
    struct sockaddr_in server_addr; 
    server_addr.sin_family = AF_INET; 
    server_addr.sin_port = htons(PORT); 
    if (inet_pton(AF_INET, SERVER_IP, &server_addr.sin_addr) <= 0) { 
        perror("Invalid address/ Address not supported"); 
        close(client_fd); 
        return -1; 
    } 
 
    udpMessage message; 
    message.header[0] = 0xeb; 
    message.header[1] = 0x91; 
    message.header[2] = 0xeb; 
    message.header[3] = 0x90; 


| 1 | #include <iostream> |
| --- | --- |
| 2 | #include <cstring> |
| 3 | #include <sys/socket.h> |
| 4 | #include <arpa/inet.h> |
| 5 | #include <unistd.h> |
| 6 |  |
| 7 | #define SERVER IP "10.21.31.103"
_ |
| 8 | #define PORT 30000 |
| 9 | #define BUFFER SIZE 1024
_ |
| 10 |  |
| 11 | struct udpMessage |
| 12 | { |
| 13 | unsigned char header[16]; |
| 14 | unsigned char data[BUFFER SIZE];
_ |
| 15 | }; |
| 16 |  |
| 17 |  |
| 18 | int main() { |
| 19 | // 创建 UDP 套接字 |
| 20 | int client fd = socket(AF INET, SOCK DGRAM, 0);
_ _ _ |
| 21 | if (client fd < 0) {
_ |
| 22 | perror("socket creation failed"); |
| 23 | return -1; |
| 24 | } |
| 25 |  |
| 26 | // 配置服务器地址 |
| 27 | struct sockaddr in server addr;
_ _ |
| 28 | server addr.sin family = AF INET;
_ _ _ |
| 29 | server addr.sin port = htons(PORT);
_ _ |
| 30 | if (inet pton(AF INET, SERVER IP, &server addr.sin addr) <= 0) {
_ _ _ _ _ |
| 31 | perror("Invalid address/ Address not supported"); |
| 32 | close(client fd);
_ |
| 33 | return -1; |
| 34 | } |
| 35 |  |
| 36 | udpMessage message; |
| 37 | message.header[0] = 0xeb; |
| 38 | message.header[1] = 0x91; |
| 39 | message.header[2] = 0xeb; |
| 40 | message.header[3] = 0x90; |


---
## 第 55 页
---

DEEP Robotics 
 55 / 57 
41 
42 
43 
44 
45 
46 
47 
48 
49 
50 
51 
52 
53 
54 
55 
56 
57 
58 
59 
60 
61 
62 
63 
64 
65 
66 
67 
68 
69 
70 
71 
72 
73 
74 
75 
76 
77 
78 
79 
 
    // 要发送的 JSON 字符串 
    const char *data = R"( 
    { 
        "PatrolDevice":{ 
            "Type":100, 
            "Command":100, 
            "Time":"2023-01-01 00:00:00", 
            "Items":{ 
            } 
        } 
    } 
    )"; 
 
    unsigned short dataLength = strlen(data); 
 
    message.header[4] = dataLength & 0xFF; 
    message.header[5] = (dataLength >> 8) & 0xFF; 
    message.header[6] = 0x01; 
    message.header[7] = 0x00; 
    message.header[8] = 0x01; 
 
    memcpy(message.data, data, strlen(data)); 
 
    // 发送数据 
    ssize_t send_len = sendto(client_fd, &message, dataLength + 16, 0, (struct sockaddr *)&server_addr,
sizeof(server_addr)); 
    if (send_len < 0) { 
        perror("sendto failed"); 
        close(client_fd); 
        return -1; 
    } 
 
    std::cout << "Message sent successfully." << std::endl; 
 
    // 关闭套接字 
    close(client_fd); 
    return 0; 
} 
 


| 41 |  |
| --- | --- |
| 42 | // 要发送的 JSON 字符串 |
| 43 | const char *data = R"( |
| 44 | { |
| 45 | "PatrolDevice":{ |
| 46 | "Type":100, |
| 47 | "Command":100, |
| 48 | "Time":"2023-01-01 00:00:00", |
| 49 | "Items":{ |
| 50 | } |
| 51 | } |
| 52 | } |
| 53 | )"; |
| 54 |  |
| 55 | unsigned short dataLength = strlen(data); |
| 56 |  |
| 57 | message.header[4] = dataLength & 0xFF; |
| 58 | message.header[5] = (dataLength >> 8) & 0xFF; |
| 59 | message.header[6] = 0x01; |
| 60 | message.header[7] = 0x00; |
| 61 | message.header[8] = 0x01; |
| 62 |  |
| 63 | memcpy(message.data, data, strlen(data)); |
| 64 |  |
| 65 | // 发送数据 |
| 66 | ssize t send len = sendto(client fd, &message, dataLength + 16, 0, (struct sockaddr *)&server addr,
_ _ _ _ |
| 67 | sizeof(server addr));
_ |
| 68 | if (send len < 0) {
_ |
| 69 | perror("sendto failed"); |
| 70 | close(client fd);
_ |
| 71 | return -1; |
| 72 | } |
| 73 |  |
| 74 | std::cout << "Message sent successfully." << std::endl; |
| 75 |  |
| 76 | // 关闭套接字 |
| 77 | close(client fd);
_ |
| 78 | return 0; |
| 79 | } |


---
## 第 56 页
---

DEEP Robotics 
 56 / 57 
附录2 机器人服务状态查询与管理方法 
• 查询服务存活状态 
1 
sudo systemctrl status XXX.service   # XXX 为服务名称 
• 临时关闭服务 
1 
sudo systemctrl stop XXX.service     # XXX 为服务名称 
• 临时开启服务 
1 
sudo systemctrl start XXX.service    # XXX 为服务名称 
• 禁用服务（取消开机自启动） 
1 
sudo systemctrl disable XXX.service    # XXX 为服务名称 
• 启用服务（开机自启动） 
1 
sudo systemctrl enable XXX.service    # XXX 为服务名称 
 
【注意】每次OTA 后，各服务的开机自启动设置将恢复为出厂默认状态，需要再次执行di
sable 指令以禁用相应服务。 
 


| 1 | sudo systemctrl status XXX.service # XXX 为服务名称 |
| --- | --- |


| 1 | sudo systemctrl stop XXX.service # XXX 为服务名称 |
| --- | --- |


| 1 | sudo systemctrl start XXX.service # XXX 为服务名称 |
| --- | --- |


| 1 | sudo systemctrl disable XXX.service # XXX 为服务名称 |
| --- | --- |


| 1 | sudo systemctrl enable XXX.service # XXX 为服务名称 |
| --- | --- |


---
## 第 57 页
---

DEEP Robotics 
 57 / 57 
附录3 相机视频流获取 
山猫M20 的前后广角相机采用RTSP 协议拉流，RTSP 地址如下所示： 
相机位置 
RTSP 地址 
前广角相机 
rtsp://10.21.31.103:8554/video1 
后广角相机 
rtsp://10.21.31.103:8554/video2 
开发者可以通过上述地址拉取前后广角相机的RTSP 视频流。 
 


| 相机位置 | RTSP 地址 |
| --- | --- |
| 前广角相机 | rtsp://10.21.31.103:8554/video1 |
| 后广角相机 | rtsp://10.21.31.103:8554/video2 |
