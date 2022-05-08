// from Alan

import { useMemo } from "react";

export interface RuleType<T> {
  required?: boolean;
  validate?: (value: T) => boolean;
  message?: string;
  defaultValue?: T;
}

export function useValidation<T>(value: T, rules?: RuleType<T>[]) {
  const invalid = useMemo(() => {
    const validation: { [key: string]: (para: any, value: T) => boolean } = {
      required: (isRequired: boolean, value: T) =>
        isRequired ? !!value : true,
      validate: (validate: (value: T) => boolean, value: T) => validate(value),
    };

    return rules?.find((rule) => {
      let key: keyof typeof validation;
      for (key in rule) {
        const validationFunc = validation[key];
        if (
          validationFunc &&
          !validationFunc(rule[key as keyof RuleType<T>], value)
        ) {
          return true;
        }
      }
      return false;
    });
  }, [rules, value]);

  return invalid;
}
