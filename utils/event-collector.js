/**
 * 事件采集器 - 记录舒尔特方格训练过程中的每一次点击
 */

class EventCollector {
  constructor() {
    this.sessionId = this._uuid()
    this.gridSize = 0
    this.startTime = 0
    this.endTime = 0
    this.events = []
    this._currentTarget = 1
    this._lastCorrectTime = 0
    this._started = false
  }

  /**
   * 初始化一个session
   * @param {number} gridSize 方格大小
   */
  init(gridSize) {
    this.gridSize = gridSize
    this.startTime = Date.now()
    this.endTime = 0
    this.events = []
    this._currentTarget = 1
    this._lastCorrectTime = 0
    this._started = false
  }

  /**
   * 记录一次点击
   * @param {number} clickedNumber 点击的数字
   * @param {number} targetNumber 期望的数字
   * @param {number} clickX 点击坐标X
   * @param {number} clickY 点击坐标Y
   * @returns {Object} 点击事件记录
   */
  recordClick(clickedNumber, targetNumber, clickX, clickY) {
    if (!this._started) {
      this._started = true
      this.startTime = Date.now()
      this._lastCorrectTime = this.startTime
    }

    const now = Date.now()
    const isCorrect = clickedNumber === targetNumber
    const reactionTime = this._lastCorrectTime > 0 ? now - this._lastCorrectTime : 0

    const event = {
      targetNumber,
      clickedNumber,
      isCorrect,
      timestamp: now,
      reactionTime,
      clickX,
      clickY
    }

    this.events.push(event)

    if (isCorrect) {
      this._lastCorrectTime = now
    }

    return event
  }

  /**
   * 结束session
   */
  finish() {
    this.endTime = Date.now()
  }

  /**
   * 获取session数据（用于上传）
   */
  getSession() {
    return {
      sessionId: this.sessionId,
      gridSize: this.gridSize,
      startTime: this.startTime,
      endTime: this.endTime,
      totalTime: this.endTime - this.startTime,
      events: this.events
    }
  }

  /**
   * 获取简化数据（仅用于本地计算，不含坐标等冗余信息）
   */
  getEventsForEval() {
    return this.events.map(e => ({
      targetNumber: e.targetNumber,
      clickedNumber: e.clickedNumber,
      isCorrect: e.isCorrect,
      timestamp: e.timestamp,
      reactionTime: e.reactionTime
    }))
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
    })
  }
}

module.exports = EventCollector
