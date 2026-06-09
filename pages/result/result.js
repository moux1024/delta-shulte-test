const { formatTime, evaluateDimensions, getGrade, getDeltaComment, getDeltaAdvice } = require('../../utils/shulte')

// 维度描述配置
const DIM_CONFIG = [
  {
    key: 'searchSpeed',
    name: '搜索速度',
    icon: '⚡',
    descMap: [
      [90, '视觉搜索能力极强，能快速锁定目标'],
      [70, '搜索效率良好，能较快发现目标'],
      [50, '存在一定搜索迟滞，建议增加训练频率'],
      [0, '视觉搜索效率较低，容易出现寻找困难']
    ],
    strength: '视觉定位能力强',
    weakness: '建议多练视觉搜索，可尝试更大的方格'
  },
  {
    key: 'stability',
    name: '注意力稳定性',
    icon: '🎯',
    descMap: [
      [90, '节奏非常稳定，不容易走神，持续输出一致'],
      [70, '注意力波动较小，整体表现稳定'],
      [50, '节奏存在波动，注意力容易漂移'],
      [0, '时快时慢明显，注意力集中能力需要加强']
    ],
    strength: '节奏稳定，不容易分心',
    weakness: '节奏波动较大，可尝试深呼吸保持专注'
  },
  {
    key: 'focus',
    name: '持续专注力',
    icon: '🧠',
    descMap: [
      [90, '后期依然保持高度专注，抗疲劳能力强'],
      [70, '后半程表现稳定，专注力维持良好'],
      [50, '后半程出现一定疲劳，注意力有所衰减'],
      [0, '后期明显变慢，容易注意力衰减']
    ],
    strength: '后期保持专注，抗疲劳能力强',
    weakness: '后半程容易疲劳，建议练习时注意休息节奏'
  },
  {
    key: 'errorControl',
    name: '错误控制能力',
    icon: '🛡️',
    descMap: [
      [90, '点击非常准确，判断极其稳定，几乎无误操作'],
      [70, '错误率较低，判断准确度良好'],
      [50, '存在一些误点，建议放慢节奏提升准确率'],
      [0, '误点较多，存在抢点行为，需要提升自控力']
    ],
    strength: '点击准确率高，判断稳定',
    weakness: '容易误点，建议先确认再点击'
  },
  {
    key: 'recovery',
    name: '恢复能力',
    icon: '💪',
    descMap: [
      [90, '出错后能瞬间恢复，抗干扰能力极强'],
      [70, '出错后调整较快，节奏恢复良好'],
      [50, '出错后恢复需要一定时间，建议练习抗干扰'],
      [0, '出错后容易慌乱，节奏恢复较慢']
    ],
    strength: '出错后迅速调整，不受干扰',
    weakness: '出错后容易节奏混乱，可训练抗压能力'
  }
]

Page({
  data: {
    grade: {},
    timeStr: '',
    dimensions: {},
    dimList: [],
    strengths: [],
    weaknesses: [],
    adviceList: [],
    showAd: false,
    bannerAdId: ''
  },

  onLoad() {
    const app = getApp()
    const result = app.globalData.lastResult

    if (!result || !result.session || !result.dimensions) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    const { session, dimensions, gridSize } = result
    const timeStr = formatTime(session.totalTime)
    const grade = getGrade(dimensions.overallScore)
    const { comment, strengths, weaknesses } = getDeltaComment(dimensions.overallScore, dimensions)
    const adviceList = getDeltaAdvice(dimensions.overallScore)

    // 构建维度列表
    const dimList = DIM_CONFIG.map(cfg => {
      const score = dimensions[cfg.key] || 0
      const desc = cfg.descMap.find(([threshold]) => score >= threshold)
      return {
        ...cfg,
        score,
        desc: desc ? desc[1] : '',
        color: _scoreColor(score)
      }
    })

    // 优势/待提升
    const strengthsList = strengths.map(s => {
      const cfg = DIM_CONFIG.find(d => d.key === s.key)
      return { ...s, icon: cfg.icon, strength: cfg.strength }
    })
    const weaknessesList = weaknesses.map(w => {
      const cfg = DIM_CONFIG.find(d => d.key === w.key)
      return { ...w, icon: cfg.icon, weakness: cfg.weakness }
    })

    this.setData({
      grade,
      timeStr,
      dimensions,
      dimList,
      strengths: strengthsList,
      weaknesses: weaknessesList,
      adviceList,
      bannerAdId: app.globalData.adConfig.bannerAdId,
      showAd: !!app.globalData.adConfig.bannerAdId
    })

    // 绘制雷达图
    wx.nextTick(() => {
      this._drawRadar(dimensions)
    })
  },

  _drawRadar(dimensions) {
    const query = wx.createSelectorQuery()
    query.select('#radarCanvas')
      .fields({ node: true, size: true })
      .exec(res => {
        if (!res[0]) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = wx.getWindowInfo().pixelRatio
        const width = res[0].width
        const height = res[0].height
        canvas.width = width * dpr
        canvas.height = height * dpr
        ctx.scale(dpr, dpr)

        const centerX = width / 2
        const centerY = height / 2
        const radius = Math.min(width, height) / 2 - 50

        const dims = [
          { label: '搜索速度', value: dimensions.searchSpeed / 100 },
          { label: '注意力\n稳定性', value: dimensions.stability / 100 },
          { label: '恢复能力', value: dimensions.recovery / 100 },
          { label: '持续专注力', value: dimensions.focus / 100 },
          { label: '错误控制', value: dimensions.errorControl / 100 }
        ]

        const n = dims.length
        const angleStep = (2 * Math.PI) / n
        const startAngle = -Math.PI / 2 // 从顶部开始

        // 清除
        ctx.clearRect(0, 0, width, height)

        // 绘制背景网格（5层）
        for (let level = 1; level <= 5; level++) {
          const r = (radius * level) / 5
          ctx.beginPath()
          for (let i = 0; i < n; i++) {
            const angle = startAngle + i * angleStep
            const x = centerX + r * Math.cos(angle)
            const y = centerY + r * Math.sin(angle)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // 绘制轴线
        for (let i = 0; i < n; i++) {
          const angle = startAngle + i * angleStep
          ctx.beginPath()
          ctx.moveTo(centerX, centerY)
          ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle))
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)'
          ctx.lineWidth = 1
          ctx.stroke()
        }

        // 绘制数据区域
        ctx.beginPath()
        for (let i = 0; i < n; i++) {
          const angle = startAngle + i * angleStep
          const r = radius * Math.max(0.05, dims[i].value)
          const x = centerX + r * Math.cos(angle)
          const y = centerY + r * Math.sin(angle)
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fillStyle = 'rgba(255, 107, 53, 0.2)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 107, 53, 0.8)'
        ctx.lineWidth = 2
        ctx.stroke()

        // 绘制数据点
        for (let i = 0; i < n; i++) {
          const angle = startAngle + i * angleStep
          const r = radius * Math.max(0.05, dims[i].value)
          const x = centerX + r * Math.cos(angle)
          const y = centerY + r * Math.sin(angle)
          ctx.beginPath()
          ctx.arc(x, y, 4, 0, 2 * Math.PI)
          ctx.fillStyle = '#ff6b35'
          ctx.fill()
          ctx.strokeStyle = '#ffffff'
          ctx.lineWidth = 1.5
          ctx.stroke()
        }

        // 绘制标签和分数
        ctx.fillStyle = '#a0a0b0'
        ctx.font = '11px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        for (let i = 0; i < n; i++) {
          const angle = startAngle + i * angleStep
          const labelR = radius + 30
          const x = centerX + labelR * Math.cos(angle)
          const y = centerY + labelR * Math.sin(angle)

          // 标签文字
          const lines = dims[i].label.split('\n')
          lines.forEach((line, li) => {
            ctx.fillStyle = '#a0a0b0'
            ctx.font = '11px sans-serif'
            ctx.fillText(line, x, y + li * 14 - (lines.length - 1) * 7)
          })

          // 分数
          ctx.fillStyle = '#ff6b35'
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(Math.round(dims[i].value * 100) + '', x, y + lines.length * 8)
        }
      })
  },

  retry() {
    wx.redirectTo({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    const { grade, dimensions, timeStr } = this.data
    return {
      title: `我在三角洲老登测试中${timeStr}，评级${grade.level}！综合评分${dimensions.overallScore}，你能超过我吗？`,
      path: '/pages/index/index',
      imageUrl: ''
    }
  }
})

function _scoreColor(score) {
  if (score >= 80) return '#2ecc71'
  if (score >= 60) return '#f39c12'
  if (score >= 40) return '#e67e22'
  return '#e74c3c'
}
