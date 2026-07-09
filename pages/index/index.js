const { formatTime } = require('../../utils/shulte')

Page({
  data: {
    difficulty: 5,
    hasBestRecord: false,
    bestRecords: {},
    showAd: false,
    bannerAdId: '',
    adIntervals: 30
  },

  onLoad() {
    const app = getApp()
    this.setData({
      bannerAdId: app.globalData.adConfig.bannerAdId
    })
    this._loadBestRecords()
  },

  onShow() {
    if (this.data.bannerAdId) {
      this.setData({ showAd: true })
    }
    this._loadBestRecords()
  },

  _loadBestRecords() {
    const records = {}
    let hasBest = false
    ;[5, 6, 7].forEach(size => {
      const t = wx.getStorageSync(`bestTime_${size}`) || 0
      if (t > 0) {
        records[size] = formatTime(t)
        hasBest = true
      }
    })
    this.setData({ bestRecords: records, hasBestRecord: hasBest })
  },

  setDifficulty(e) {
    const size = parseInt(e.currentTarget.dataset.size)
    this.setData({ difficulty: size })
  },

  startGame() {
    wx.navigateTo({
      url: `/pages/game/game?size=${this.data.difficulty}`
    })
  },

  openTestResult() {
    const app = getApp()
    app.globalData.lastResult = {
      session: {
        sessionId: `test_${Date.now()}`,
        gridSize: this.data.difficulty,
        totalTime: 28680,
        events: []
      },
      dimensions: {
        searchSpeed: 86,
        stability: 78,
        focus: 72,
        errorControl: 91,
        spatialMemory: 84,
        overallScore: 82,
        details: {}
      }
    }

    wx.navigateTo({
      url: '/pages/result/result'
    })
  },

  onShareAppMessage() {
    return {
      title: '测测你适不适合玩三角洲',
      path: '/pages/index/index',
      imageUrl: ''
    }
  },

  onShareTimeline() {
    return {
      title: '三角洲老登反应力测试',
      query: ''
    }
  }
})
