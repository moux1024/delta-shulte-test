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
  onLaunch() {}
})
