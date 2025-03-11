export interface Option {
  id: string;
  text: string;
  isOther?: boolean;
}

export interface ReferenceLink {
  title: string;
  url: string;
}

export interface AlbumImage {
  url: string;
  alt: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  references?: ReferenceLink[];
  image?: AlbumImage;
}

export interface QuestionGroup {
  id: string;
  name: string;
  description: string;
  questions: Question[];
}

export interface Questions {
  groups: QuestionGroup[];
  solo_questions: Question[];
}
