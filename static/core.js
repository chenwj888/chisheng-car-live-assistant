/*
 * 驰声 · 汽车直播口播助手
 * 纯前端文本处理核心：分段 / 分句 / 随机编排 / 形容词近义替换
 * 同时兼容浏览器与 Node.js（用于自动化测试）。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.CarLiveCore = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SAMPLE_SCRIPT = `家人们，欢迎来到直播间。今天给大家带来一台非常适合家用的中型SUV，外观大气，空间宽敞，开起来也很舒服。

先看外观，整车线条很流畅，前脸时尚，灯组精致，停在路边很有辨识度。车身颜色也很耐看，年轻人和家庭用户都能接受。

坐进车内，内饰用料扎实，座椅柔软，后排空间非常宽敞。智能座舱反应很快，语音控制方便，日常通勤和周末出游都够用。

动力方面，这台车起步轻快，加速平顺，底盘稳定，油耗也比较省。现在直播间有专属试驾权益，点击下方表单留资，到店还能领取一份到店礼。`;

  const MODES = {
    sequential: {
      label: '顺序朗读',
      short: '顺序',
      hint: '保留原有段落与句子顺序，适合首次彩排。'
    },
    sentence: {
      label: '全篇句乱序（不推荐）',
      short: '句乱序',
      hint: '把全篇句子打散后随机朗读，变化最大，但可能打断有前后关系的句子。'
    },
    paragraph: {
      label: '安全乱序（按段，推荐）',
      short: '安全乱序',
      hint: '段落顺序随机，段内句子保持原顺序；有顺序或前后关系的句子不会被拆开。'
    },
    within: {
      label: '段序固定 · 段内变序',
      short: '段内变序',
      hint: '段落顺序不变，每段保留首句，其余句子随机；可能打断强关联句。'
    },
    smart: {
      label: '智能轮播（段内变序）',
      short: '智能轮播',
      hint: '段落随机，段内保留首句后随机；变化更大，但可能打断强关联句。'
    }
  };

  const COMMON_MODEL = {
    id: 'common',
    name: '通用',
    brandId: 'common',
    brandName: '通用'
  };

  const CAR_BRANDS = [
    {
      id: 'honda',
      name: '广汽本田',
      models: [
        { id: 'accord', name: '雅阁', aliases: ['雅阁', 'Accord'] },
        { id: 'odyssey', name: '奥德赛', aliases: ['奥德赛', 'Odyssey'] },
        { id: 'integra', name: '型格', aliases: ['型格', 'Integra'] },
        { id: 'avancier', name: '冠道', aliases: ['冠道', 'Avancier'] },
        { id: 'breeze', name: '皓影', aliases: ['皓影', 'Breeze'] }
      ]
    },
    {
      id: 'gac',
      name: '广汽传祺',
      models: [
        { id: 'm8', name: 'M8', aliases: ['M8'] },
        { id: 'e8', name: 'E8', aliases: ['E8'] },
        { id: 'yue7', name: '越7', aliases: ['越7', '越 7'] },
        { id: 'm6', name: 'M6', aliases: ['M6'] },
        { id: 's7', name: 'S7', aliases: ['S7'] },
        { id: 'gs4', name: 'GS4', aliases: ['GS4'] }
      ]
    }
  ];

  const CAR_MODELS = [];
  CAR_BRANDS.forEach(function (brand) {
    brand.models.forEach(function (model) {
      CAR_MODELS.push({
        id: model.id,
        name: model.name,
        aliases: model.aliases.slice(),
        brandId: brand.id,
        brandName: brand.name
      });
    });
  });

  function getModelById(id) {
    if (id === COMMON_MODEL.id) return COMMON_MODEL;
    return CAR_MODELS.find(function (model) { return model.id === id; }) || null;
  }

  /*
   * 只收录在汽车口播里语义相对稳定、替换后不容易产生歧义的形容词/程度词。
   * block 用于避开固定搭配（如“智能驾驶”“运动模式”“高级感”）。
   */
  const SYNONYMS = {
    '非常': { alts: ['特别', '相当', '格外'], block: /^(规|态|任)/ },
    '十分': { alts: ['非常', '格外', '相当'], block: /^(钟|重|必要)/ },
    '特别': { alts: ['格外', '相当', '尤其'], block: /^(是|需要|适合|关注|提醒|注意|重要)/ },
    '超级': { alts: ['相当', '格外', '非常'], block: /^(市场|跑|级)/ },

    '好看': { alts: ['漂亮', '养眼', '耐看'] },
    '漂亮': { alts: ['好看', '养眼', '亮眼'] },
    '大气': { alts: ['有气场', '沉稳', '舒展'] },
    '时尚': { alts: ['潮流', '新潮', '摩登'] },
    '精致': { alts: ['细腻', '讲究', '精巧'] },
    '高级': { alts: ['有质感', '有档次', '气派'], block: /^(感|版|型|品牌|车系|轿车|SUV)/ },
    '豪华': { alts: ['高级', '气派', '奢享'], block: /^(版|型|品牌|车系|车)/ },
    '运动': { alts: ['动感', '年轻', '有冲劲'], block: /^(模式|版|座椅|套件|化|性能|型)/ },
    '舒适': { alts: ['舒服', '惬意', '松弛'], block: /^(性|配置|进入|模式|度)/ },
    '舒服': { alts: ['舒适', '惬意', '舒坦'] },
    '宽敞': { alts: ['宽适', '阔绰', '开阔'] },
    '宽裕': { alts: ['充裕', '阔绰', '充足'] },
    '省油': { alts: ['节油', '油耗低', '经济'] },
    '强劲': { alts: ['充沛', '有劲', '浑厚'] },
    '平顺': { alts: ['顺滑', '丝滑', '顺畅'] },
    '稳定': { alts: ['扎实', '稳健', '靠谱'] },
    '灵活': { alts: ['灵动', '轻巧', '好开'] },
    '安静': { alts: ['静谧', '静音', '隔音好'] },
    '智能': { alts: ['聪明', '智慧', '机灵'], block: /^(驾驶|座舱|辅助|语音|配置|系统|化|网联|泊车|芯片|手机|家居)/ },
    '安全': { alts: ['安心', '可靠', '稳妥'], block: /^(配置|气囊|带|标准|测试|性能|系统|辅助|性)/ },
    '方便': { alts: ['便捷', '省事', '顺手'] },
    '贴心': { alts: ['周到', '懂你', '人性化'] },
    '实惠': { alts: ['划算', '超值', '性价比高'] },
    '便宜': { alts: ['亲民', '不贵', '门槛低'] },
    '热门': { alts: ['抢手', '火爆', '高人气'] },
    '最新': { alts: ['全新', '新款', '当季'] },
    '优秀': { alts: ['出色', '亮眼', '能打'] },
    '完美': { alts: ['到位', '周全', '挑不出毛病'] },
    '霸气': { alts: ['硬朗', '有气场', '威猛'] },
    '温柔': { alts: ['柔和', '温润', '亲和'] },
    '耐用': { alts: ['皮实', '抗造', '可靠'] },
    '巨大': { alts: ['超大', '阔绰', '充裕'] },
    '快速': { alts: ['迅捷', '利落', '响应快'] },
    '很快': { alts: ['挺快', '比较快', '迅速'] },
    '清楚': { alts: ['清晰', '直观', '明白'] },
    '耐看': { alts: ['好看', '养眼', '经典'] },
    '流畅': { alts: ['顺滑', '利落', '自然'] },
    '扎实': { alts: ['稳健', '靠谱', '厚实'] },
    '轻快': { alts: ['轻巧', '利落', '爽快'] },
    '柔软': { alts: ['软和', '柔和', '舒服'] },
    '细腻': { alts: ['精致', '柔和', '讲究'] },
    '亮眼': { alts: ['抢眼', '出众', '吸睛'] },
    '亲民': { alts: ['实惠', '不高', '接地气'] },
    '省心': { alts: ['省事', '安心', '踏实'] },
    '靠谱': { alts: ['稳当', '扎实', '放心'] },
    '充裕': { alts: ['宽裕', '充足', '够用'] },
    '充足': { alts: ['充裕', '够用', '饱满'] },
    '灵敏': { alts: ['跟手', '迅捷', '反应快'] },
    '清晰': { alts: ['清楚', '直观', '明白'] },
    '静谧': { alts: ['安静', '静音', '隔音好'] },
    '动感': { alts: ['运动', '有冲劲', '年轻'] },
    '潮流': { alts: ['时尚', '新潮', '当季'] },
    '新潮': { alts: ['时尚', '潮流', '新鲜'] }
  };

  const SYNONYM_COUNT = Object.keys(SYNONYMS).length;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeRegExp(str) {
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function normalizeText(input) {
    if (input === null || input === undefined) return '';
    let text = String(input)
      .replace(/^\uFEFF/, '')
      .replace(/\r\n?/g, '\n')
      .replace(/[\u00a0\u3000]/g, ' ')
      .replace(/[\u200b\u200c\u200d\ufeff]/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    // 表情符号不会被部分语音引擎正确朗读，直接去掉。
    try {
      text = text.replace(/\p{Extended_Pictographic}/gu, '');
    } catch (_) {
      // 老版本浏览器不支持 Unicode 属性转义时保持原样。
    }

    // Markdown 标题、项目符号与分隔线。
    text = text.replace(/^\s{0,3}#{1,6}\s*/gm, '');
    text = text.replace(/^\s*[-*•]\s+/gm, '');
    text = text.replace(/^\s*[-—=*_]{3,}\s*$/gm, '');

    // 常见的舞台提示 / 镜头提示，避免被念出来；其他方括号内容保留。
    text = text.replace(/【([^】\n]{0,30})】/g, function (matched, inner) {
      return /音乐|镜头|音效|掌声|停顿|切|展示|画面|BGM/i.test(inner) ? '' : matched;
    });
    text = text.replace(/\[[^\]\n]{0,30}\]/g, function (matched) {
      return /音乐|镜头|音效|掌声|停顿|切|展示|画面|BGM/i.test(matched) ? '' : matched;
    });
    text = text.replace(/[（(][^）)\n]{0,24}(?:镜头|音乐|音效|掌声|停顿|切|展示|画面|BGM)[^）)\n]{0,24}[）)]/gi, '');

    text = text.replace(/[~～]+/g, '，');
    text = text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return text;
  }

  function modelAliasPattern(alias) {
    const escaped = escapeRegExp(alias);
    if (/^[A-Za-z0-9]+$/.test(alias)) {
      return '(?<![A-Za-z0-9])' + escaped + '(?![A-Za-z0-9])';
    }
    return escaped;
  }

  /**
   * 识别单独成行的车型标题，例如：
   * 【雅阁】 / 雅阁： / ## 雅阁 / 广汽本田 雅阁 / M8 车型讲解
   * 普通正文“雅阁的空间很大”不会被当成标题。
   */
  function parseModelHeading(rawLine) {
    let line = String(rawLine || '').trim();
    if (!line) return null;

    const hadMarkdown = /^#{1,6}\s*/.test(line);
    const hadBracket = /^[【\[（(]/.test(line) || /[】\]）)]$/.test(line);

    line = line.replace(/^#{1,6}\s*/, '');
    line = line.replace(/^[-*•]\s*/, '');
    line = line.replace(/^[一二三四五六七八九十百0-9]+[、.．]\s*/, '');
    line = line.replace(/^[【\[（(]\s*/, '').replace(/\s*[】\]）)]\s*$/, '');
    line = line.replace(/^(广汽本田|广汽传祺|本田|传祺)\s*[:：\-—]?\s*/, '');
    if (!line) return null;

    const models = CAR_MODELS.slice().sort(function (a, b) {
      const longestA = Math.max.apply(null, a.aliases.map(function (item) { return item.length; }));
      const longestB = Math.max.apply(null, b.aliases.map(function (item) { return item.length; }));
      return longestB - longestA;
    });

    for (let i = 0; i < models.length; i += 1) {
      const model = models[i];
      const aliases = model.aliases.slice().sort(function (a, b) { return b.length - a.length; });
      for (let j = 0; j < aliases.length; j += 1) {
        const re = new RegExp('^\\s*' + modelAliasPattern(aliases[j]) + '\\s*(.*)$', 'i');
        const match = line.match(re);
        if (!match) continue;

        const rest = (match[1] || '').trim();
        let content = '';

        if (!rest) {
          return { modelId: model.id, content: content };
        }

        const separator = rest.match(/^[：:｜|—\-·]\s*(.*)$/);
        if (separator) {
          return { modelId: model.id, content: (separator[1] || '').trim() };
        }

        const keyword = rest.match(/^(车型|车系|专场|介绍|讲稿|话术|配置|价格|优惠|卖点|亮点|核心|产品)(?:讲解|介绍)?(?:\s*[：:｜|—\-·]\s*(.*))?$/);
        if (keyword) {
          return { modelId: model.id, content: (keyword[2] || '').trim() };
        }

        if ((hadBracket || hadMarkdown) && rest.length <= 14 && !/[。！？!?]/.test(rest)) {
          return { modelId: model.id, content: '' };
        }

        // 以车型名开头但后面是正文时，不当作新标题。
        return null;
      }
    }
    return null;
  }

  /**
   * 把一段包含多个车型标题的文本拆成车型讲稿。
   * 返回 sections（按车型 id）、detected（有正文的车型，按出现顺序）。
   * 第一个车型标题之前的内容归入 common（通用）。
   */
  function splitByModels(input) {
    const text = normalizeText(input);
    if (!text) {
      return { sections: {}, detected: [], hasHeadings: false, text: '' };
    }

    const buckets = Object.create(null);
    const detectedOrder = [];
    let current = COMMON_MODEL.id;
    let hasHeadings = false;

    function bucketFor(id) {
      if (!buckets[id]) buckets[id] = [];
      return buckets[id];
    }

    text.split('\n').forEach(function (line) {
      const heading = parseModelHeading(line);
      if (heading) {
        hasHeadings = true;
        current = heading.modelId;
        if (detectedOrder.indexOf(current) === -1) detectedOrder.push(current);
        if (heading.content) bucketFor(current).push(heading.content);
        return;
      }
      bucketFor(current).push(line);
    });

    const sections = {};
    Object.keys(buckets).forEach(function (id) {
      const content = buckets[id].join('\n').replace(/\n{3,}/g, '\n\n').trim();
      if (content) sections[id] = content;
    });

    return {
      sections: sections,
      detected: detectedOrder.filter(function (id) { return Boolean(sections[id]); }),
      hasHeadings: hasHeadings,
      text: text
    };
  }

  function splitLongSentence(sentence, maxChars) {
    const limit = maxChars || 90;
    let rest = sentence;
    const parts = [];
    while (rest.length > limit) {
      const window = rest.slice(0, limit);
      let cut = Math.max(
        window.lastIndexOf('，'),
        window.lastIndexOf('、'),
        window.lastIndexOf(',')
      );
      if (cut < limit * 0.55) cut = window.lastIndexOf(' ');
      if (cut < limit * 0.55) break;
      parts.push(rest.slice(0, cut + 1).trim());
      rest = rest.slice(cut + 1).trim();
    }
    if (rest) parts.push(rest);
    return parts.length ? parts : [sentence];
  }

  function splitSentences(text) {
    const source = String(text || '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!source) return [];
    const re = /[^。！？!?；;…]+(?:[。！？!?；;…]+[”’」』】）)]?|$)/g;
    const raw = source.match(re) || [];
    const result = [];
    for (let i = 0; i < raw.length; i += 1) {
      const sentence = raw[i].trim();
      if (!sentence) continue;
      splitLongSentence(sentence).forEach(function (part) {
        if (part.trim()) result.push(part.trim());
      });
    }
    return result;
  }

  const ENUMERATION_MARKER_RE = /第([一二三四五六七八九十百]+)(?=[，,、：:；;。\s]|点|条|个|方面|步|招|是|要|看|讲|说)/g;
  const ORDINAL_DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };

  function chineseOrdinalValue(raw) {
    const text = String(raw || '');
    if (!text) return 0;
    if (text === '十') return 10;
    if (text === '百') return 100;
    if (text.indexOf('十') !== -1) {
      const pieces = text.split('十');
      const tens = pieces[0] ? ORDINAL_DIGITS[pieces[0]] || 0 : 1;
      const ones = pieces[1] ? ORDINAL_DIGITS[pieces[1]] || 0 : 0;
      return tens * 10 + ones;
    }
    return ORDINAL_DIGITS[text] || 0;
  }

  function ordinalValuesInText(text) {
    const values = [];
    const source = String(text || '');
    const re = new RegExp(ENUMERATION_MARKER_RE.source, 'g');
    let match;
    while ((match = re.exec(source)) !== null) {
      const value = chineseOrdinalValue(match[1]);
      if (value && values.indexOf(value) === -1) values.push(value);
    }
    return values;
  }

  function isEnumeratedParagraph(text) {
    const values = ordinalValuesInText(text);
    if (values.length < 2) return false;
    for (let i = 0; i < values.length - 1; i += 1) {
      if (values[i + 1] === values[i] + 1) return true;
    }
    return values[0] === 1 && values.length >= 2;
  }

  function leadingOrdinalValue(text) {
    const source = String(text || '').trim();
    const match = source.match(/^第([一二三四五六七八九十百]+)(?=[，,、：:；;。\s]|点|条|个|方面|步|招|是|要|看|讲|说)/);
    return match ? chineseOrdinalValue(match[1]) : 0;
  }

  function makeParagraph(text, index, locked) {
    const paragraphText = String(text || '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (!paragraphText) return null;
    const sentenceTexts = splitSentences(paragraphText);
    if (!sentenceTexts.length) return null;
    const paragraphIndex = index;
    return {
      index: paragraphIndex,
      text: paragraphText,
      locked: Boolean(locked),
      sentences: sentenceTexts.map(function (sentence, sentenceIndex) {
        return {
          text: sentence,
          paragraphIndex: paragraphIndex,
          sentenceIndex: sentenceIndex + 1
        };
      })
    };
  }

  function mergeEnumeratedParagraphs(paragraphs) {
    const result = [];
    let i = 0;
    while (i < paragraphs.length) {
      const paragraph = paragraphs[i];
      const startValue = leadingOrdinalValue(paragraph.text);
      const enumerated = isEnumeratedParagraph(paragraph.text);

      if (!startValue) {
        const rebuilt = makeParagraph(paragraph.text, result.length + 1, enumerated);
        if (rebuilt) result.push(rebuilt);
        i += 1;
        continue;
      }

      let run = [paragraph];
      let nextValue = startValue + 1;
      let j = i + 1;
      while (j < paragraphs.length) {
        const value = leadingOrdinalValue(paragraphs[j].text);
        if (value !== nextValue) break;
        run.push(paragraphs[j]);
        nextValue += 1;
        j += 1;
      }

      if (run.length >= 2 || enumerated) {
        const merged = makeParagraph(
          run.map(function (item) { return item.text; }).join(' '),
          result.length + 1,
          true
        );
        if (merged) result.push(merged);
        i = j;
      } else {
        const rebuilt = makeParagraph(paragraph.text, result.length + 1, false);
        if (rebuilt) result.push(rebuilt);
        i += 1;
      }
    }
    return result;
  }

  function parseScript(input) {
    const text = normalizeText(input);
    if (!text) {
      return { text: '', paragraphs: [], sentences: [] };
    }

    let blocks;
    if (/\n\s*\n/.test(text)) {
      blocks = text.split(/\n\s*\n/);
    } else {
      const lines = text.split('\n').map(function (line) { return line.trim(); }).filter(Boolean);
      const allLookLikeSentences = lines.length > 1 && lines.every(function (line) {
        return /[。！？!?；;…]$/.test(line);
      });
      blocks = allLookLikeSentences ? lines : [text];
    }

    const initialParagraphs = [];
    blocks.forEach(function (block) {
      const paragraph = makeParagraph(block, initialParagraphs.length + 1, false);
      if (paragraph) initialParagraphs.push(paragraph);
    });

    const paragraphs = mergeEnumeratedParagraphs(initialParagraphs);
    const sentences = [];
    paragraphs.forEach(function (paragraph) {
      paragraph.sentences.forEach(function (sentence) {
        sentences.push(sentence);
      });
    });

    return { text: text, paragraphs: paragraphs, sentences: sentences };
  }

  function shuffle(items, rng) {
    const array = items.slice();
    const random = rng || Math.random;
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  function keepFirstShuffleRest(sentences, rng) {
    if (sentences.length <= 1) return sentences.slice();
    return [sentences[0]].concat(shuffle(sentences.slice(1), rng));
  }

  function markProtected(mask, start, end) {
    const from = Math.max(0, start);
    const to = Math.min(mask.length, end);
    for (let i = from; i < to; i += 1) mask[i] = 1;
  }

  function buildProtectedMask(text, extraWords) {
    const mask = new Uint8Array(text.length);
    const patterns = [
      /https?:\/\/[^\s，。；、]+/gi,
      /1[3-9]\d{9}/g,
      /[0-9]+(?:[.,][0-9]+)?\s*(?:万|元|块|km|公里|米|mm|cm|L|T|kW|PS|马力|年|款|座|寸|英寸|秒|小时|个|台|人|次|%|％)?/gi,
      /[A-Za-z][A-Za-z0-9+\-_.]*/g,
      /“[^”]{0,100}”/g,
      /"[^"]{0,100}"/g,
      /【[^】]{0,100}】/g
    ];

    patterns.forEach(function (pattern) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        markProtected(mask, match.index, match.index + match[0].length);
        if (match[0].length === 0) pattern.lastIndex += 1;
      }
    });

    const words = String(extraWords || '')
      .split(/[,，、;；\s]+/)
      .map(function (word) { return word.trim(); })
      .filter(function (word) { return word.length > 0; });

    words.forEach(function (word) {
      let from = 0;
      while (from <= text.length - word.length) {
        const index = text.indexOf(word, from);
        if (index === -1) break;
        markProtected(mask, index, index + word.length);
        from = index + word.length;
      }
    });

    return mask;
  }

  function overlapsMask(mask, start, end) {
    for (let i = start; i < end; i += 1) {
      if (mask[i]) return true;
    }
    return false;
  }

  function isBlockedSuffix(text, end, block) {
    if (!block) return false;
    return block.test(text.slice(end));
  }

  function probabilityFor(strength) {
    return 0.28 + (clamp(strength, 0, 100) / 100) * 0.58;
  }

  function maxChangesFor(text, strength) {
    const length = text.length;
    if (strength >= 80) return length >= 42 ? 3 : 2;
    if (strength >= 45) return length >= 28 ? 2 : 1;
    return 1;
  }

  /**
   * 返回 { text, parts, changes }。
   * parts 保留“哪些词被替换”，用于界面高亮，不改变原文标点与顺序。
   */
  function rewriteText(text, options) {
    const opts = options || {};
    const source = String(text || '');
    const strength = clamp(Number(opts.strength === undefined ? 55 : opts.strength), 0, 100);
    const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
    if (!source || strength <= 0) {
      return { text: source, parts: [{ text: source, changed: false }], changes: 0 };
    }

    const mask = buildProtectedMask(source, opts.protectedWords);
    const probability = probabilityFor(strength);
    const candidates = [];

    Object.keys(SYNONYMS)
      .sort(function (a, b) { return b.length - a.length; })
      .forEach(function (word) {
        if (source.indexOf(word) === -1) return;
        const entry = SYNONYMS[word];
        let from = 0;
        while (from <= source.length - word.length) {
          const start = source.indexOf(word, from);
          if (start === -1) break;
          const end = start + word.length;
          from = end;
          if (overlapsMask(mask, start, end)) continue;
          if (isBlockedSuffix(source, end, entry.block)) continue;
          if (rng() > probability) continue;

          const available = entry.alts.filter(function (alt) { return alt !== word; });
          if (!available.length) continue;
          const replacement = available[Math.floor(rng() * available.length) % available.length];
          candidates.push({ start: start, end: end, from: word, to: replacement });
        }
      });

    const pool = shuffle(candidates, rng);
    const limit = maxChangesFor(source, strength);
    const picked = [];

    for (let i = 0; i < pool.length && picked.length < limit; i += 1) {
      const candidate = pool[i];
      let conflict = false;
      for (let j = 0; j < picked.length; j += 1) {
        if (candidate.start < picked[j].end && candidate.end > picked[j].start) {
          conflict = true;
          break;
        }
      }
      if (!conflict) picked.push(candidate);
    }

    if (!picked.length) {
      return { text: source, parts: [{ text: source, changed: false }], changes: 0 };
    }

    picked.sort(function (a, b) { return a.start - b.start; });
    const parts = [];
    let cursor = 0;
    picked.forEach(function (change) {
      if (change.start > cursor) {
        parts.push({ text: source.slice(cursor, change.start), changed: false });
      }
      parts.push({ text: change.to, changed: true, from: change.from });
      cursor = change.end;
    });
    if (cursor < source.length) {
      parts.push({ text: source.slice(cursor), changed: false });
    }

    return {
      text: parts.map(function (part) { return part.text; }).join(''),
      parts: parts,
      changes: picked.length
    };
  }

  function sentenceRecord(sentence) {
    return {
      text: sentence.text,
      paragraphIndex: sentence.paragraphIndex,
      sentenceIndex: sentence.sentenceIndex,
      locked: Boolean(sentence.locked)
    };
  }

  /**
   * 根据模式生成播放队列。每条都是“一句”，段落信息保留在元数据里。
   */
  function buildQueue(parsed, options) {
    const opts = options || {};
    const mode = MODES[opts.mode] ? opts.mode : 'smart';
    const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
    const rewrite = opts.rewrite !== false;
    const strength = clamp(Number(opts.strength === undefined ? 55 : opts.strength), 0, 100);
    const protectedWords = opts.protectedWords || '';

    let groups = parsed.paragraphs.map(function (paragraph) {
      const locked = Boolean(paragraph.locked);
      return {
        paragraphIndex: paragraph.index,
        locked: locked,
        sentences: locked
          ? [{
              text: paragraph.text,
              paragraphIndex: paragraph.index,
              sentenceIndex: 1,
              locked: true
            }]
          : paragraph.sentences.map(sentenceRecord)
      };
    });

    if (mode === 'sentence') {
      const all = [];
      groups.forEach(function (group) {
        group.sentences.forEach(function (sentence) { all.push(sentence); });
      });
      groups = [{ paragraphIndex: null, sentences: shuffle(all, rng) }];
    } else if (mode === 'paragraph') {
      groups = shuffle(groups, rng);
    } else if (mode === 'within') {
      groups = groups.map(function (group) {
        return {
          paragraphIndex: group.paragraphIndex,
          locked: group.locked,
          sentences: group.locked ? group.sentences : keepFirstShuffleRest(group.sentences, rng)
        };
      });
    } else if (mode === 'smart') {
      groups = shuffle(groups, rng).map(function (group) {
        return {
          paragraphIndex: group.paragraphIndex,
          locked: group.locked,
          sentences: group.locked ? group.sentences : keepFirstShuffleRest(group.sentences, rng)
        };
      });
    }

    const queue = [];
    let sequence = 0;
    groups.forEach(function (group) {
      group.sentences.forEach(function (sentence) {
        sequence += 1;
        const rewritten = rewrite
          ? rewriteText(sentence.text, { strength: strength, protectedWords: protectedWords, rng: rng })
          : { text: sentence.text, parts: [{ text: sentence.text, changed: false }], changes: 0 };
        queue.push({
          id: 's' + sequence,
          text: rewritten.text,
          original: sentence.text,
          parts: rewritten.parts,
          changes: rewritten.changes,
          paragraphIndex: sentence.paragraphIndex,
          sentenceIndex: sentence.sentenceIndex,
          locked: Boolean(sentence.locked || group.locked),
          mode: mode
        });
      });
    });

    // 轮播衔接时避免上一轮结尾与这一轮开头完全相同。
    if (opts.previousLastText && queue.length > 1 && queue[0].text === opts.previousLastText) {
      for (let i = 1; i < queue.length; i += 1) {
        if (queue[i].text !== opts.previousLastText) {
          const temp = queue[0];
          queue[0] = queue[i];
          queue[i] = temp;
          break;
        }
      }
    }

    // 极少数情况下重复句会挨在一起，尽量错开。
    for (let i = 1; i < queue.length; i += 1) {
      if (queue[i].text === queue[i - 1].text && queue.length > 2) {
        const target = (i + 1) % queue.length;
        const temp = queue[i];
        queue[i] = queue[target];
        queue[target] = temp;
      }
    }

    return queue;
  }

  function estimateDuration(text, rate) {
    const content = String(text || '');
    if (!content) return 0;
    const chars = Array.from(content).length;
    const pauses = (content.match(/[，。！？!?；;…、]/g) || []).length;
    return (chars / 4.2 + pauses * 0.12) / Math.max(0.5, Number(rate) || 1);
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    return mins + ':' + String(secs).padStart(2, '0');
  }

  function getStats(parsed) {
    const chars = (parsed.text || '').replace(/\s/g, '').length;
    return {
      chars: chars,
      paragraphs: parsed.paragraphs.length,
      sentences: parsed.sentences.length
    };
  }

  return {
    SAMPLE_SCRIPT: SAMPLE_SCRIPT,
    MODES: MODES,
    CAR_BRANDS: CAR_BRANDS,
    CAR_MODELS: CAR_MODELS,
    COMMON_MODEL: COMMON_MODEL,
    getModelById: getModelById,
    parseModelHeading: parseModelHeading,
    splitByModels: splitByModels,
    SYNONYMS: SYNONYMS,
    SYNONYM_COUNT: SYNONYM_COUNT,
    normalizeText: normalizeText,
    parseScript: parseScript,
    splitSentences: splitSentences,
    rewriteText: rewriteText,
    buildQueue: buildQueue,
    estimateDuration: estimateDuration,
    formatDuration: formatDuration,
    getStats: getStats,
    shuffle: shuffle
  };
});
