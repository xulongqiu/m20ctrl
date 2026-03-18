#!/usr/bin/env node
/**
 * Agora RTM Token Generator
 * 用法: node generate_token.js <appCertificate> <uid> [expireSeconds]
 * 
 * 生成 RTM 2.x 兼容的 AccessToken2 Token
 */
const { RtmTokenBuilder, RtcTokenBuilder, RtcRole } = require('agora-token');

const APP_ID = 'f37a493c9c3846b487c535ec03e9f555';

// 从命令行参数获取
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('用法: node generate_token.js <appCertificate> <uid> [expireSeconds]');
    console.log('');
    console.log('示例:');
    console.log('  node generate_token.js abc123def456 dd_m20_xlq_mac 3600');
    console.log('  node generate_token.js abc123def456 dd_m20_xlq_mac_rtm_ui');
    process.exit(1);
}

const appCertificate = args[0];
const uid = args[1];
const expireSeconds = parseInt(args[2]) || 86400; // 默认 24 小时

console.log('=== Agora Token Generator ===');
console.log(`App ID: ${APP_ID}`);
console.log(`App Certificate: ${appCertificate.substring(0, 6)}...`);
console.log(`UID: ${uid}`);
console.log(`Expire: ${expireSeconds}s (${(expireSeconds / 3600).toFixed(1)}h)`);
console.log('');

// 生成 RTM Token
try {
    const rtmToken = RtmTokenBuilder.buildToken(APP_ID, appCertificate, uid, expireSeconds);
    console.log(`✅ RTM Token (len=${rtmToken.length}):`);
    console.log(rtmToken);
    console.log('');
} catch (e) {
    console.error(`❌ RTM Token 生成失败: ${e.message}`);
}

// 同时生成 RTC Token (如果需要)
try {
    const channelName = 'm20-ctrl';
    // 对于字符串 UID，使用 buildTokenWithUserAccount
    const rtcToken = RtcTokenBuilder.buildTokenWithUserAccount(
        APP_ID, appCertificate, channelName, uid, RtcRole.PUBLISHER, expireSeconds
    );
    console.log(`✅ RTC Token for channel "${channelName}" (len=${rtcToken.length}):`);
    console.log(rtcToken);
    console.log('');
} catch (e) {
    console.error(`❌ RTC Token 生成失败: ${e.message}`);
}

console.log('=== 完成 ===');
