export interface Faq {
  readonly id: string;
  readonly question_en: string;
  readonly answer_en: string;
  readonly question_bn: string;
  readonly answer_bn: string;
  readonly sort_order: number;
  readonly is_published: boolean;
}
