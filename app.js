App({
  globalData: {
    // 广告单元ID，替换为你的真实广告ID
    adConfig: {
      // banner广告
      bannerAdId: 'adunit-xxxxxxxxxxxxxxx',
      // 激励视频广告（看完解锁详细报告）
      rewardedVideoAdId: 'adunit-xxxxxxxxxxxxxxx',
      // 插屏广告
      interstitialAdId: 'adunit-xxxxxxxxxxxxxxx'
    },
    // 上次测试结果（供结果页读取）
    lastResult: null
  },
  onLaunch() {
    // 云开发初始化
    if (wx.cloud) {
      wx.cloud.init({
        // env 填写你的云开发环境 ID，在微信开发者工具「云开发」控制台获取
        env: '',
        traceUser: true
      })
    }
  }
})
