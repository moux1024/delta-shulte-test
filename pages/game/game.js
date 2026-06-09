const { generateShulteGrid, formatTime, evaluateDimensions, getGrade, getDeltaComment } = require('../../utils/shulte')
const EventCollector = require('../../utils/event-collector')

Page({
  data: {
    gridSize: 5,
    grid: [],
    currentNum: 1,
    totalNum: 25,
    timerDisplay: '0.00s',
    progressPercent: 0,
    errorCount: 0,
    showError: false,
    showComplete: false,
    started: false,
    finalTimeStr: '',
    overallScore: 0,
    gradeName: '',
    gradeColor: '',
    deltaComment: '',
    hasRewardedAd: false,
    // 用于传递给结果页
    _sessionData: null,
    _dimensions: null
  },

  _collector: null,
  _timer: null,
  _rewardedVideoAd: null,

  onLoad(options) {
    const size = parseInt(options.size) || 5
    const totalNum = size * size
    const grid = generateShulteGrid(size)

    this.setData({ gridSize: size, grid, totalNum })

    // 初始化事件采集器
    this._collector = new EventCollector()
    this._collector.init(size)

    // 初始化激励视频广告
    const app = getApp()
    const adId = app.globalData.adConfig.rewardedVideoAdId
    if (adId && adId.indexOf('xxxxxxxx') === -1) {
      this._rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: adId })
      this._rewardedVideoAd.onLoad(() => {
        this.setData({ hasRewardedAd: true })
      })
      this._rewardedVideoAd.onError(() => {
        this.setData({ hasRewardedAd: false })
      })
    }
  },

  onUnload() {
    if (this._timer) {
      clearInterval(this._timer)
      this._timer = null
    }
  },

  onCellTap(e) {
    const { num, index } = e.currentTarget.dataset
    const { currentNum, totalNum, gridSize, started } = this.data

    // 获取点击坐标（相对方格左上角）
    const query = wx.createSelectorQuery()
    query.select('.grid').boundingClientRect()
    query.exec((rects) => {
      const gridRect = rects[0]
      // approximate center of cell
      const clickX = 0
      const clickY = 0

      // 记录事件
      this._collector.recordClick(num, currentNum, clickX, clickY)

      // 首次点击开始计时
      if (!started && num === 1) {
        this.setData({ started: true })
        this._timer = setInterval(() => {
          const elapsed = Date.now() - this._collector.startTime
          this.setData({ timerDisplay: formatTime(elapsed) })
        }, 50)
      }

      if (num !== currentNum) {
        // 点错了
        this.setData({ showError: true, errorCount: this.data.errorCount + 1 })
        const grid = this.data.grid
        const wrongKey = `grid[${index}].wrong`
        this.setData({ [wrongKey]: true })
        setTimeout(() => {
          this.setData({ showError: false, [wrongKey]: false })
        }, 600)
        return
      }

      // 正确 - 标记已找到
      const foundKey = `grid[${index}].found`
      this.setData({
        [foundKey]: true,
        currentNum: currentNum + 1,
        progressPercent: Math.round((currentNum / totalNum) * 100)
      })

      // 检查是否完成
      if (currentNum === totalNum) {
        this._onComplete()
      }
    })
  },

  _onComplete() {
    clearInterval(this._timer)
    this._timer = null

    this._collector.finish()

    const session = this._collector.getSession()
    const timeMs = session.totalTime

    // 多维度评估
    const dimensions = evaluateDimensions(this._collector.getEventsForEval(), this.data.gridSize)
    const grade = getGrade(dimensions.overallScore)
    const { comment } = getDeltaComment(dimensions.overallScore, dimensions)

    // 更新最佳记录
    const app = getApp()
    const bestKey = `bestTime_${this.data.gridSize}`
    const prevBest = wx.getStorageSync(bestKey) || 0
    if (!prevBest || timeMs < prevBest) {
      wx.setStorageSync(bestKey, timeMs)
      app.globalData.bestTime = timeMs
      // 上传最佳记录
      this._uploadBest(timeMs, dimensions)
    }

    this.setData({
      showComplete: true,
      finalTimeStr: formatTime(timeMs),
      overallScore: dimensions.overallScore,
      gradeName: grade.grade,
      gradeColor: grade.color,
      deltaComment: comment,
      _sessionData: session,
      _dimensions: dimensions
    })

    // 上传session数据
    this._uploadSession(session, dimensions)
  },

  _uploadSession(session, dimensions) {
    const { uploadSession } = require('../../utils/api')
    uploadSession(session, dimensions)
  },

  _uploadBest(timeMs, dimensions) {
    const { uploadBestRecord } = require('../../utils/api')
    uploadBestRecord({
      gridSize: this.data.gridSize,
      totalTime: timeMs,
      overallScore: dimensions.overallScore
    })
  },

  retryGame() {
    const { gridSize } = this.data
    const grid = generateShulteGrid(gridSize)
    clearInterval(this._timer)
    this._timer = null
    this._collector.init(gridSize)

    this.setData({
      grid,
      currentNum: 1,
      timerDisplay: '0.00s',
      progressPercent: 0,
      errorCount: 0,
      showComplete: false,
      showError: false,
      started: false
    })
  },

  goResult() {
    const { _sessionData, _dimensions } = this.data
    // 通过全局变量传递数据（避免URL长度限制）
    const app = getApp()
    app.globalData.lastResult = {
      session: _sessionData,
      dimensions: _dimensions,
      gridSize: this.data.gridSize
    }
    wx.redirectTo({
      url: `/pages/result/result`
    })
  },

  watchAdForDouble() {
    if (this._rewardedVideoAd) {
      this._rewardedVideoAd.show().catch(() => {
        this._rewardedVideoAd.load().then(() => this._rewardedVideoAd.show())
      })
    }
  }
})
