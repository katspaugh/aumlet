export type NumberParamDef = {
  kind: 'number';
  placeholder: string;
  width: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue: number;
};

export type SelectParamDef = {
  kind: 'select';
  options: string[];
  defaultValue: string;
};

export type ParamDef = NumberParamDef | SelectParamDef;

export type ParamDefMap = Record<string, ParamDef>;
