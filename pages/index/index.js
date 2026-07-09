const { getDeltaAdvice } = require('../../utils/shulte')

const TEST_RESULT_GROUPS = [
  {
    score: 90,
    profileHint: '猎手',
    dimensions: {
      searchSpeed: 96,
      stability: 82,
      focus: 78,
      errorControl: 90,
      spatialMemory: 86,
      overallScore: 90,
      details: {}
    }
  },
  {
    score: 76,
    profileHint: '游击将军',
    dimensions: {
      searchSpeed: 93,
      stability: 68,
      focus: 64,
      errorControl: 75,
      spatialMemory: 20,
      overallScore: 76,
      details: {}
    }
  },
  {
    score: 51,
    profileHint: '控场大师',
    dimensions: {
      searchSpeed: 42,
      stability: 50,
      focus: 46,
      errorControl: 55,
      spatialMemory: 94,
      overallScore: 51,
      details: {}
    }
  },
  {
    score: 60,
    profileHint: '守株待兔',
    dimensions: {
      searchSpeed: 48,
      stability: 92,
      focus: 74,
      errorControl: 66,
      spatialMemory: 62,
      overallScore: 60,
      details: {}
    }
  },
  {
    score: 52,
    profileHint: '“守”“护”者',
    dimensions: {
      searchSpeed: 30,
      stability: 70,
      focus: 92,
      errorControl: 86,
      spatialMemory: 38,
      overallScore: 52,
      details: {}
    }
  }
]

const TEST_RESULTS = TEST_RESULT_GROUPS.flatMap(group => {
  return getDeltaAdvice(group.score).map((item, adviceIndex) => ({
    ...item,
    adviceIndex,
    score: group.score,
    dimensions: group.dimensions,
    label: `${group.profileHint} ${adviceIndex + 1}`
  }))
})

Page({
  data: {
    difficulty: 5,
    testResults: TEST_RESULTS,
    showAd: false,
    bannerAdId: '',
    adIntervals: 30
  },

  onLoad() {
    const app = getApp()
    this.setData({
      bannerAdId: app.globalData.adConfig.bannerAdId
    })
  },

  onShow() {
    if (this.data.bannerAdId) {
      this.setData({ showAd: true })
    }
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

  openTestResult(e) {
    const testIndex = Number(e.currentTarget.dataset.index || 0)
    const testResult = TEST_RESULTS[testIndex] || TEST_RESULTS[0]
    const app = getApp()
    app.globalData.lastResult = {
      session: {
        sessionId: `test_${Date.now()}`,
        gridSize: this.data.difficulty,
        totalTime: 28680,
        events: []
      },
      dimensions: testResult.dimensions,
      selectedTypeInterpretation: {
        icon: testResult.icon,
        text: testResult.text
      },
      adviceIndex: testResult.adviceIndex
    }

    wx.navigateTo({
      url: `/pages/result/result?adviceIndex=${testResult.adviceIndex}`
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
