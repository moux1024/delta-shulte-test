const { formatTime, getGrade, getDeltaComment, getDeltaAdvice } = require('../../utils/shulte')
const { operators } = require('../../data/operators')

const ROLE_CONFIG = [
  { key: 'assault', name: '突击', abilities: ['fastDecision', 'risk', 'tempo'], style: '侧翼突破手' },
  { key: 'recon', name: '侦察', abilities: ['intel', 'planning'], style: '信息先手位' },
  { key: 'support', name: '支援', abilities: ['teamPlay', 'planning', 'tolerance'], style: '团队稳定器' },
  { key: 'engineer', name: '工程', abilities: ['planning', 'control', 'setup'], style: '阵地控场者' }
]

const OPERATOR_MATRIX = {
  '蝶': {
    intel: 75, // 信息获取
    planning: 70, // 战术规划
    teamPlay: 95, // 团队协作
    risk: 50 // 风险承受
  },
  '蛊': {
    intel: 60, // 信息获取
    planning: 70, // 战术规划
    teamPlay: 90, // 团队协作
    risk: 40 // 风险承受
  },
  '蜂医': {
    intel: 25, // 信息获取
    planning: 60, // 战术规划
    teamPlay: 100, // 团队协作
    risk: 65 // 风险承受
  },
  '红狼': {
    fastDecision: 100, // 快速决策
    risk: 80, // 风险承受
    tempo: 100 // 战斗节奏
  },
  '威龙': {
    fastDecision: 90, // 快速决策
    risk: 90, // 风险承受
    tempo: 95 // 战斗节奏
  },
  '疾风': {
    fastDecision: 90, // 快速决策
    risk: 100, // 风险承受
    tempo: 90 // 战斗节奏
  },
  '无名': {
    fastDecision: 80, // 快速决策
    risk: 75, // 风险承受
    tempo: 80, // 战斗节奏
    teamPlay: 0 // 团队协作
  },
  '露娜': {
    intel: 95, // 信息获取
    planning: 75, // 战术规划
    setup: 65, // 道具布置
    control: 75 // 地图控制
  },
  '银翼': {
    intel: 95, // 信息获取
    planning: 85, // 战术规划
    teamPlay: 70 // 团队协作
  },
  '骇爪': {
    intel: 95, // 信息获取
    planning: 90, // 战术规划
    teamPlay: 70 // 团队协作
  },
  '回响': {
    intel: 100, // 信息获取
    planning: 95, // 战术规划
    control: 75 // 地图控制
  },
  '比特': {
    setup: 100, // 道具布置
    planning: 95, // 战术规划
    control: 100, // 地图控制
    teamPlay: 60 // 团队协作
  },
  '液氮': {
    setup: 100, // 道具布置
    planning: 90, // 战术规划
    control: 95, // 地图控制
    tolerance: 60 // 容错能力
  },
  '深蓝': {
    planning: 70, // 战术规划
    control: 80, // 地图控制
    teamPlay: 100 // 团队协作
  },
  '乌鲁鲁': {
    planning: 100, // 战术规划
    control: 95, // 地图控制
    teamPlay: 80 // 团队协作
  },
  '牧羊人': {
    setup: 100, // 道具布置
    planning: 100, // 战术规划
    control: 100, // 地图控制
    teamPlay: 80 // 团队协作
  }
}

const OPERATOR_RECOMMENDATION_POOLS = [
  ['威龙', '红狼', '露娜', '骇爪', '疾风', '蜂医', '液氮', '乌鲁鲁'],
  ['牧羊人', '蝶', '无名', '银翼', '比特', '回响'],
  ['深蓝', '蛊']
]

const PERSONA_CONFIG = [
  {
    name: '猎手',
    weights: { searchSpeed: 0.5, fastDecision: 0.3, spatialMemory: 0.2 },
    preferredRoles: ['assault', 'recon'],
    preferredOperators: ['露娜', '银翼', '骇爪'],
    tags: ['高速决策者', '侧翼猎手', '战场突破者'],
    summary: '你的目标锁定和空间记忆突出, 适合主动找机会打开战局。快速收集信息, 利用技能压迫对方暴露身位, 制造局部2打1的机会。'
  },
  {
    name: '控场大师',
    weights: { spatialMemory: 0.55, setup: 0.30, planning: 0.15 },
    preferredRoles: ['engineer', 'recon'],
    preferredOperators: ['牧羊人', '比特', '液氮', '露娜'],
    tags: ['点位记忆者', '道具布置手', '预判控场者'],
    summary: '空间记忆突出, 更适合利用地形、布置道具；挤压对方走位, 直至收网。'
  },
  {
    name: '游击将军',
    weights: { searchSpeed: 0.35, fastDecision: 0.3, tempo: 0.2, risk: 0.15 },
    preferredRoles: ['assault', 'recon'],
    preferredOperators: ['威龙', '无名', '疾风', '红狼'],
    tags: ['机动拉扯者', '快节奏游击', '机会捕手'],
    summary: '天下武功, 无坚不摧, 唯快不破。在运动中撕开对手的防线, 及时转点, 以防直架。'
  },
  {
    name: '守株待兔',
    weights: { stability: 0.35, planning: 0.35, control: 0.3 },
    preferredRoles: ['engineer', 'recon'],
    preferredOperators: ['牧羊人', '乌鲁鲁', '银翼'],
    tags: ['稳定指挥位', '战术预判者', '节奏管理者'],
    summary: '稳定性和规划能力更强, 适合组织推进、路线判断、守株待兔。呃, 我不是说堵桥。'
  },
  {
    name: '“守”“护”者',
    weights: { focus: 0.35, teamPlay: 0.35, tolerance: 0.3 },
    preferredRoles: ['support', 'engineer'],
    preferredOperators: ['蝶', '蜂医', '深蓝'],
    tags: ['团队支点', '持续专注', '抗压补位'],
    summary: '持续专注和团队协同更突出, 适合保护队伍容错。守着护航kuku吃也算守护吧……'
  },
  {
    name: '核心区老吃家',
    weights: { control: 0.4, planning: 0.35, stability: 0.25 },
    preferredRoles: ['engineer', 'recon', 'support'],
    preferredOperators: ['比特', '蜂医', '回响'],
    tags: ['一夫当关', '阵地战'],
    summary: '控制和预判能力占优, 适合通过阵地与道具压缩敌方空间。先进核心的赢。'
  }
]

// 维度描述配置
const DIM_CONFIG = [
  {
    key: 'searchSpeed',
    name: '完成效率',
    descMap: [
      [90, '完成速度极强, 综合搜索和点击效率很高'],
      [70, '完成效率良好, 整体节奏比较顺畅'],
      [50, '完成效率一般, 中途存在一定卡顿'],
      [0, '完成效率较低, 寻找和点击过程明显吃力']
    ],
    strength: '完成效率高, 整体表现强',
    weakness: '完成效率偏低, 可先练标准 5×5 提升节奏'
  },
  {
    key: 'stability',
    name: '注意力稳定性',
    descMap: [
      [90, '节奏非常稳定, 不容易走神, 持续输出一致'],
      [70, '注意力波动较小, 整体表现稳定'],
      [50, '节奏存在波动, 注意力容易漂移'],
      [0, '时快时慢明显, 注意力集中能力需要加强']
    ],
    strength: '节奏稳定, 不容易分心',
    weakness: '节奏波动较大, 可尝试深呼吸保持专注'
  },
  {
    key: 'focus',
    name: '持续专注力',
    descMap: [
      [90, '后期依然保持高度专注, 抗疲劳能力强'],
      [70, '后半程表现稳定, 专注力维持良好'],
      [50, '后半程出现一定疲劳, 注意力有所衰减'],
      [0, '后期明显变慢, 容易注意力衰减']
    ],
    strength: '后期保持专注, 抗疲劳能力强',
    weakness: '后半程容易疲劳, 建议练习时注意休息节奏'
  },
  {
    key: 'errorControl',
    name: '错误控制能力',
    descMap: [
      [90, '点击非常准确, 判断极其稳定, 几乎无误操作'],
      [70, '错误率较低, 判断准确度良好'],
      [50, '存在一些误点, 建议放慢节奏提升准确率'],
      [0, '误点较多, 存在抢点行为, 需要提升自控力']
    ],
    strength: '点击准确率高, 判断稳定',
    weakness: '容易误点, 建议先确认再点击'
  },
  {
    key: 'spatialMemory',
    name: '空间记忆能力',
    descMap: [
      [90, '后期搜索明显加速, 数字位置记忆很强'],
      [70, '后期寻找效率提升, 空间记忆表现良好'],
      [50, '后期提速不明显, 可加强位置记忆训练'],
      [0, '后期仍需重新搜索, 空间记忆利用不足']
    ],
    strength: '数字位置记忆清晰, 后期搜索更快',
    weakness: '空间记忆利用不足, 可尝试记住数字分布'
  }
]

Page({
  data: {
    grade: {},
    timeStr: '',
    dimensions: {},
    profile: {},
    roleList: [],
    operatorList: [],
    tags: [],
    primaryRole: {},
    primaryOperator: {},
    dimList: [],
    strengths: [],
    weaknesses: [],
    typeInterpretations: [],
    selectedTypeInterpretation: {},
    showAd: false,
    bannerAdId: ''
  },

  onLoad(options) {
    const app = getApp()
    const result = app.globalData.lastResult

    if (!result || !result.session || !result.dimensions) {
      wx.redirectTo({ url: '/pages/index/index' })
      return
    }

    const { session, dimensions } = result
    const timeStr = formatTime(session.totalTime)
    const grade = getGrade(dimensions.overallScore)
    const { strengths, weaknesses } = getDeltaComment(dimensions.overallScore, dimensions)
    const typeInterpretations = getDeltaAdvice(dimensions.overallScore)
    const selectedTypeInterpretation = result.selectedTypeInterpretation ||
      this._pickAdvice(typeInterpretations, options.adviceIndex || result.adviceIndex)
    const combat = _toCombatModel(dimensions)
    const profile = _getPersona(dimensions, combat)
    const roleList = _rankRoles(combat, profile)
    const operatorList = _rankOperators(combat, profile, dimensions.overallScore)
    const primaryRole = roleList[0] || {}
    const primaryOperator = operatorList[0] || {}
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
      profile,
      roleList,
      operatorList,
      tags: profile.tags || [],
      primaryRole,
      primaryOperator,
      dimList,
      strengths: strengthsList,
      weaknesses: weaknessesList,
      typeInterpretations,
      selectedTypeInterpretation,
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
          { label: '完成效率', value: dimensions.searchSpeed / 100 },
          { label: '注意力\n稳定性', value: dimensions.stability / 100 },
          { label: '空间\n记忆', value: dimensions.spatialMemory / 100 },
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
        ctx.fillStyle = 'rgba(37, 99, 235, 0.14)'
        ctx.fill()
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.8)'
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
          ctx.fillStyle = '#2563eb'
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
          ctx.fillStyle = '#2563eb'
          ctx.font = 'bold 13px sans-serif'
          ctx.fillText(Math.round(dims[i].value * 100) + '', x, y + lines.length * 8)
        }
      })
  },

  retry() {
    wx.redirectTo({ url: '/pages/index/index' })
  },

  _pickAdvice(list, index) {
    if (!list || list.length === 0) return {}
    const parsedIndex = Number(index)
    if (Number.isInteger(parsedIndex) && parsedIndex >= 0 && parsedIndex < list.length) {
      return list[parsedIndex]
    }
    return list[Math.floor(Math.random() * list.length)]
  }
})

function _toCombatModel(dimensions) {
  const searchSpeed = dimensions.searchSpeed || 0
  const stability = dimensions.stability || 0
  const focus = dimensions.focus || 0
  const errorControl = dimensions.errorControl || 0
  const spatialMemory = dimensions.spatialMemory || 0
  const directAction = (searchSpeed + stability + focus + errorControl) / 4
  const setup = _round(spatialMemory * 0.75 + (100 - directAction) * 0.25)

  return {
    intel: _round(searchSpeed * 0.8 + stability * 0.2),
    fastDecision: _round(searchSpeed * 0.7 + spatialMemory * 0.3),
    planning: _round(stability * 0.6 + focus * 0.4),
    tolerance: _round(errorControl * 0.8 + spatialMemory * 0.2),
    teamPlay: _round(focus * 0.7 + stability * 0.3),
    risk: _round(spatialMemory * 0.6 + searchSpeed * 0.4),
    tempo: _round(spatialMemory * 0.5 + searchSpeed * 0.5),
    control: _round(stability * 0.5 + focus * 0.5),
    setup
  }
}

function _rankRoles(combat, profile) {
  return ROLE_CONFIG.map(role => {
    const baseScore = role.abilities.reduce((sum, key) => sum + (combat[key] || 0), 0) / role.abilities.length
    const preferenceIndex = (profile.preferredRoles || []).indexOf(role.key)
    const personaBonus = preferenceIndex >= 0 ? 10 - preferenceIndex * 4 : 0
    const score = _round(baseScore + personaBonus)
    return {
      ...role,
      score,
      color: _scoreColor(score)
    }
  }).sort((a, b) => b.score - a.score)
}

function _rankOperators(combat, profile, overallScore) {
  const pool = _getOperatorPoolByScore(overallScore)
  return _rankOperatorPool(pool, combat, profile).slice(0, 3)
}

function _getOperatorPoolByScore(overallScore) {
  if (overallScore >= 80) return OPERATOR_RECOMMENDATION_POOLS[0]
  if (overallScore >= 40) return OPERATOR_RECOMMENDATION_POOLS[1]
  return OPERATOR_RECOMMENDATION_POOLS[2]
}

function _rankOperatorPool(pool, combat, profile) {
  return pool.map(codename => {
    const vector = OPERATOR_MATRIX[codename]
    if (!vector) return null

    const op = operators.find(item => item.codename === codename) || { codename, class: '' }
    const keys = Object.keys(vector)
    const similarity = _cosineSimilarity(keys.map(key => combat[key] || 0), keys.map(key => vector[key] || 0))
    const baseMatch = similarity * 100
    const preferenceIndex = (profile.preferredOperators || []).indexOf(codename)
    const preferenceBonuses = [32, 28, 22, 18]
    const personaBonus = preferenceIndex >= 0 ? preferenceBonuses[preferenceIndex] || 12 : 0
    const rankScore = baseMatch * 0.75 + personaBonus
    const match = _round(rankScore)
    return {
      codename,
      name: op.name || '',
      className: op.class || '',
      match,
      rankScore,
      color: _scoreColor(match),
      reason: _operatorReason(codename, vector, combat),
      ability: op.abilities ? op.abilities.tactical_gear : ''
    }
  }).filter(Boolean).sort((a, b) => b.rankScore - a.rankScore)
}

function _getPersona(dimensions, combat) {
  const merged = { ...dimensions, ...combat }
  const ranked = PERSONA_CONFIG.map(persona => {
    const score = _round(Object.keys(persona.weights).reduce((sum, key) => {
      return sum + (merged[key] || 0) * persona.weights[key]
    }, 0))
    return { ...persona, score }
  }).sort((a, b) => b.score - a.score)
  return ranked[0]
}

function _operatorReason(codename, vector, combat) {
  if (codename === '蛊') {
    return '您的手速和反应不太适合正面硬拼, 想肥肥得吃还是点护子吧!老板!'
  }

  const keyNameMap = {
    intel: '信息获取',
    fastDecision: '快速决策',
    planning: '战术规划',
    setup: '道具布置',
    tolerance: '容错',
    teamPlay: '团队协作',
    risk: '风险承受',
    tempo: '战斗节奏',
    control: '地图控制'
  }
  const topKeys = Object.keys(vector)
    .sort((a, b) => (combat[b] || 0) - (combat[a] || 0))
    .slice(0, 2)
    .map(key => keyNameMap[key])
    .join('、')
  return `${topKeys}与你的能力画像最接近, 适合${_operatorStyle(codename)}。`
}

function _operatorStyle(codename) {
  const styleMap = {
    '红狼': '高速冲锋和连续突破',
    '威龙': '快速进场和强制开团',
    '疾风': '机动拉扯和脱离复位',
    '无名': '隐蔽切入和干扰突破',
    '露娜': '持续侦察和挤压敌方走位',
    '银翼': '无人机侦察和路线压制',
    '骇爪': '电子侦察和静默渗透',
    '回响': '声音侦察和区域扫描',
    '蝶': '救援保护和团队续航',
    '蛊': '治疗增益和视听干扰',
    '蜂医': '烟幕治疗和倒地救援',
    '比特': '部署防守和区域封锁',
    '液氮': '区域封锁和路线限制',
    '深蓝': '盾牌推进和后方保护',
    '乌鲁鲁': '掩体构筑和火力压制',
    '牧羊人': '提前布置声波陷阱和阵地压制'
  }
  return styleMap[codename] || '当前战斗定位'
}

function _cosineSimilarity(a, b) {
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0)
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0))
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0))
  if (!normA || !normB) return 0
  return dot / (normA * normB)
}

function _round(value) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function _scoreColor(score) {
  if (score >= 80) return '#2ecc71'
  if (score >= 60) return '#f39c12'
  if (score >= 40) return '#e67e22'
  return '#e74c3c'
}
