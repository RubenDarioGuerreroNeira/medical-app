export interface TelegramMessageOptions {
  text: string;
  parse_mode?: "Markdown" | "HTML";
  reply_markup?: {
    inline_keyboard: Array<
      Array<{
        text: string;
        callback_data: string;
      }>
    >;
  };
}
