export type MarkdownEditorHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type MarkdownEditorToolbarConfig = {
  allowedHeadingLevels: MarkdownEditorHeadingLevel[];
  strikeThroughOptions: Array<'Strikethrough' | 'Sub' | 'Sup'>;
  showHighlight: boolean;
  showEmoji: boolean;
  showTable: boolean;
  showAdmonition: boolean;
  showThematicBreak: boolean;
};

export function getMarkdownEditorToolbarConfig(fullToolbar: boolean): MarkdownEditorToolbarConfig {
  if (fullToolbar) {
    return {
      allowedHeadingLevels: [1, 2, 3, 4, 5, 6],
      strikeThroughOptions: ['Strikethrough', 'Sub', 'Sup'],
      showHighlight: true,
      showEmoji: true,
      showTable: true,
      showAdmonition: true,
      showThematicBreak: true,
    };
  }

  return {
    allowedHeadingLevels: [1, 2, 3],
    strikeThroughOptions: ['Strikethrough'],
    showHighlight: false,
    showEmoji: false,
    showTable: false,
    showAdmonition: false,
    showThematicBreak: false,
  };
}
