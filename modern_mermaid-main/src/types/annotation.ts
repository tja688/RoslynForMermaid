// 标注类型定义
export type AnnotationType = 'arrow' | 'text' | 'rect' | 'circle' | 'line';

export interface Point {
  x: number;
  y: number;
}

export interface BaseAnnotation {
  id: string;
  type: AnnotationType;
  color: string;
  strokeWidth: number;
}

export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  start: Point;
  end: Point;
}

export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Point;
  text: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontFamily?: string;
}

export interface RectAnnotation extends BaseAnnotation {
  type: 'rect';
  position: Point;
  width: number;
  height: number;
  fill: string;
  opacity: number;
}

export interface CircleAnnotation extends BaseAnnotation {
  type: 'circle';
  center: Point;
  radius: number;
  fill: string;
  opacity: number;
}

export interface LineAnnotation extends BaseAnnotation {
  type: 'line';
  start: Point;
  end: Point;
}

export type Annotation = 
  | ArrowAnnotation 
  | TextAnnotation 
  | RectAnnotation 
  | CircleAnnotation 
  | LineAnnotation;

