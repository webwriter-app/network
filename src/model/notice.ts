export type NoticeVariant = 'primary' | 'success' | 'neutral' | 'warning' | 'danger';

/** Reports something to the person using the widget. `message` is plain text; lines are separated by newlines. */
export type Notify = (variant: NoticeVariant, header: string, message: string) => void;

/** Translates a source text. The widget passes the `msg` of its localizer. */
export type Translate = (text: string) => string;

export const keepText: Translate = (text) => text;
