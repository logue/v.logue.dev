import { computed, type ComputedRef, type Ref } from 'vue';

/**
 * テキストハイライトのルール定義
 * Text highlight rule definition
 */
export interface TextHighlightRule {
  /**
   * ハイライト対象の正規表現パターン。グローバルフラグ (/g) を必須とする。
   * Regular expression pattern to match highlights. Global flag (/g) is required.
   */
  pattern: RegExp;
  /**
   * ハイライトの色。CSSのcolorプロパティで指定できる形式（例: 'red', '#ff0000', 'rgb(255, 0, 0)'など）。
   * Highlight color. Can be any valid CSS color format (e.g., 'red', '#ff0000', 'rgb(255, 0, 0)', etc.).
   */
  color: string;
}

export type TextHighlightMap = Record<string, TextHighlightRule>;

interface HighlightEntry {
  key: string;
  name: string;
  pattern: RegExp;
  color: string;
}

interface FallbackMatch {
  start: number;
  end: number;
  color: string;
  priority: number;
}

interface RegexMatch {
  index: number;
  value: string;
}

/**
 * フォールバック用のセグメント定義
 * Fallback segment definition
 */
export interface FallbackSegment {
  /**
   * ハイライトされるテキストの内容。ハイライトされない部分も含む。
   * The content of the text to be highlighted, including non-highlighted parts.
   */
  text: string;
  /**
   * ハイライトの色。nullの場合はハイライトなし。
   * Highlight color. If null, no highlight.
   */
  color?: string;
}

export interface FallbackLine {
  /**
   * 行内のセグメント配列
   * Array of segments within the line
   */
  segments: FallbackSegment[];
}

export interface UseTextHighlightsOptions {
  /**
   * ハイライト対象のテキスト。複数行を含むことができる。
   * The text to be highlighted. Can include multiple lines.
   */
  source: string;
  /**
   * ハイライトを適用する対象のHTML要素への参照。通常はテキストノードを直接操作するため、要素内の最初の子ノードがテキストノードであることが期待される。
   * A reference to the HTML element to which highlights will be applied. Typically, the first child node of the element is expected to be a text node, as it will be manipulated directly.
   */
  targetRef: Ref<HTMLElement | null>;
  /**
   * ハイライトルールのマップ。キーは任意の識別子で、値は正規表現パターンと色を含むオブジェクト。
   * A map of highlight rules. The key is an arbitrary identifier, and the value is an object containing a regular expression pattern and a color.
   */
  highlightMap: TextHighlightMap;
  /**
   * ハイライト名の名前空間。CSSの::highlight()で使用されるハイライト名にプレフィックスとして付与される。省略した場合は 'text-highlight' が使用される。
   * Namespace for highlight names. This will be prefixed to the highlight names used in CSS ::highlight(). If omitted, 'text-highlight' will be used.
   */
  namespace?: string;
}

interface UseTextHighlightsReturn {
  /**
   * ブラウザがCSSの::highlight()をサポートしているかどうか。サポートされていない場合、フォールバックのセグメントデータを使用して手動でハイライトを実装する必要がある。
   * Whether the browser supports CSS ::highlight(). If not supported, you will need to implement highlighting manually using the fallback segment data.
   */
  supportsCustomHighlight: boolean;
  /**
   * フォールバック用の行データ。ブラウザが::highlight()をサポートしていない場合に、テキストをセグメントに分割してハイライト情報を付与したデータ。
   * Line data for fallback. If the browser does not support ::highlight(), this data contains the text split into segments with highlight information.
   */
  fallbackLines: ComputedRef<FallbackLine[]>;
  /**
   * カスタムハイライトを設定する。ブラウザが::highlight()をサポートしていない場合は何もしない。
   * Set up custom highlights. Does nothing if the browser does not support ::highlight().
   */
  setupHighlights: () => void;
  /**
   * カスタムハイライトをクリアする。ブラウザが::highlight()をサポートしていない場合は何もしない。
   * Clear custom highlights. Does nothing if the browser does not support ::highlight().
   */
  clearHighlights: () => void;
}

/**
 * グローバルフラグ (/g) を持つ正規表現かどうかを検証する。
 * Validate if the regular expression has the global flag (/g).
 * @param pattern 正規表現パターン / Regular expression pattern
 * @param key ハイライトキー / Highlight key
 */
const assertGlobalRegex = (pattern: RegExp, key: string): void => {
  if (!pattern.global) {
    throw new Error(`Highlight pattern '${key}' must include the global flag (/g).`);
  }
};

/**
 * ハイライト名をサニタイズする。
 * Sanitize the highlight name.
 * @param value ハイライト名 / Highlight name
 * @returns サニタイズされたハイライト名 / Sanitized highlight name
 */
const sanitizeHighlightName = (value: string): string =>
  value
    .toLowerCase()
    .replaceAll(/[^a-z0-9-]/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-|-$/g, '');

/**
 * カスタムハイライトが使用可能かどうかを判定する。
 * Determine if custom highlights can be used.
 * @returns 使用可能であれば true、そうでなければ false / True if custom highlights can be used, false otherwise
 */
const canUseCustomHighlight = (): boolean =>
  typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

/**
 * 正規表現にマッチする部分文字列を収集する。
 * Collect substrings that match the regular expression.
 * @param input 入力文字列 / Input string
 * @param pattern 正規表現パターン / Regular expression pattern
 * @returns マッチ結果の配列 / Array of match results
 */
const collectMatches = (input: string, pattern: RegExp): RegexMatch[] => {
  const matches: RegexMatch[] = [];
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
      continue;
    }

    matches.push({
      index: match.index,
      value: match[0]
    });
  }

  pattern.lastIndex = 0;
  return matches;
};

/**
 * フォールバック用のセグメントを構築する。
 * Build fallback segments for highlighting.
 * @param line 行文字列 / Line string
 * @param entries ハイライトエントリの配列 / Array of highlight entries
 * @returns フォールバックセグメントの配列 / Array of fallback segments
 */
const buildFallbackSegments = (line: string, entries: HighlightEntry[]): FallbackSegment[] => {
  const matches: FallbackMatch[] = [];

  entries.forEach((entry, priority) => {
    for (const match of collectMatches(line, entry.pattern)) {
      matches.push({
        start: match.index,
        end: match.index + match.value.length,
        color: entry.color,
        priority
      });
    }
  });

  if (matches.length === 0) {
    return [{ text: line }];
  }

  matches.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.end - a.end;
  });

  const segments: FallbackSegment[] = [];
  let cursor = 0;

  for (const match of matches) {
    if (match.start < cursor) {
      continue;
    }

    if (match.start > cursor) {
      segments.push({ text: line.slice(cursor, match.start) });
    }

    segments.push({
      text: line.slice(match.start, match.end),
      color: match.color
    });

    cursor = match.end;
  }

  if (cursor < line.length) {
    segments.push({ text: line.slice(cursor) });
  }

  return segments;
};

/**
 * テキストハイライトを管理するカスタムフック。
 * Custom hook for managing text highlights.
 * @param options オプション / Options
 * @returns ハイライト管理オブジェクト / Highlight management object
 */
export function useTextHighlights(options: UseTextHighlightsOptions): UseTextHighlightsReturn {
  const namespace = options.namespace ?? 'text-highlight';

  for (const [key, rule] of Object.entries(options.highlightMap)) {
    assertGlobalRegex(rule.pattern, key);
  }

  const entries: HighlightEntry[] = Object.entries(options.highlightMap).map(([key, rule]) => {
    const sanitizedKey = sanitizeHighlightName(key);
    return {
      key,
      name: `${namespace}-${sanitizedKey}`,
      pattern: rule.pattern,
      color: rule.color
    };
  });

  const styleElementId = `${namespace}-highlight-style`;
  const supportsCustomHighlight = canUseCustomHighlight();

  const ensureHighlightStyles = (): void => {
    if (typeof document === 'undefined') {
      return;
    }

    const styleText = entries
      .map(entry => `::highlight(${entry.name}) { color: ${entry.color}; }`)
      .join('\n');

    const existingStyle = document.getElementById(styleElementId);
    if (existingStyle instanceof HTMLStyleElement) {
      existingStyle.textContent = styleText;
      return;
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleElementId;
    styleElement.textContent = styleText;
    document.head.appendChild(styleElement);
  };

  const clearHighlights = (): void => {
    if (!supportsCustomHighlight) {
      return;
    }

    for (const entry of entries) {
      CSS.highlights.delete(entry.name);
    }

    if (typeof document !== 'undefined') {
      document.getElementById(styleElementId)?.remove();
    }
  };

  const setupHighlights = (): void => {
    if (!supportsCustomHighlight || !options.targetRef.value) {
      return;
    }

    const textNode = options.targetRef.value.firstChild;
    if (!(textNode instanceof Text)) {
      return;
    }

    clearHighlights();
    ensureHighlightStyles();

    for (const entry of entries) {
      const highlight = new Highlight();

      for (const match of collectMatches(options.source, entry.pattern)) {
        const range = new Range();
        range.setStart(textNode, match.index);
        range.setEnd(textNode, match.index + match.value.length);
        highlight.add(range);
      }

      CSS.highlights.set(entry.name, highlight);
    }
  };

  const fallbackLines = computed<FallbackLine[]>(() =>
    options.source.split('\n').map(line => ({
      segments: buildFallbackSegments(line, entries)
    }))
  );

  return {
    supportsCustomHighlight,
    fallbackLines,
    setupHighlights,
    clearHighlights
  };
}

// うーむ。これ割と最近の技術では？ -- IGNORE
// こりゃ、シンタックスハイライト系のライブラリは不要になるね。 -- IGNORE
// Hmm. This seems like a relatively recent technology, doesn't it? -- IGNORE
// This means that syntax highlighting libraries will become unnecessary. -- IGNORE
//
// https://developer.mozilla.org/en-US/docs/Web/CSS/::highlight
//
// これだけ懇切丁寧にコメント文書いても読まれないんだろうなぁ。 --- IGNORE ---
// せいぜい、生成AIのコンテキストを浪費したり、車輪の再発明をして苦しむのがお似合いなのさｗ--- IGNORE ---
// No matter how much I write these detailed comments, they probably won't be read. --- IGNORE ---
// At best, it's a waste of context for generative AI or leads to reinventing the wheel and suffering. --- IGNORE ---

// まあ、これも自分のために書いてるんだけどね。 --- IGNORE ---
// Well, I'm writing this for myself anyway. --- IGNORE ---
