export type AttributeType = 'number' | 'string' | 'boolean' | 'color' | 'select';

export interface ParametricAttribute {
  readonly id: string;
  readonly attribute_uri_key: string;
  readonly attribute_value: string;
  readonly attribute_type: AttributeType;
}

export interface FixedAttribute {
  readonly id: string;
  readonly attribute_uri_key: string;
  readonly attribute_value: string;
}

export interface OriginAttribute {
  readonly id: string;
  readonly dimension_uri_key: string;
  readonly dimension_uri_value: number;
}

export interface SceneElement {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly parametric_attributes: readonly ParametricAttribute[];
  readonly fixed_attributes: readonly FixedAttribute[];
  readonly origin_attributes: readonly OriginAttribute[];
  readonly rotation_attributes: readonly OriginAttribute[];
  readonly child_elements: readonly SceneElement[];
}

export interface ElementStoreData {
  readonly elements: readonly SceneElement[];
}
