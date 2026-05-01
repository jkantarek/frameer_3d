import type { FolderApi } from 'tweakpane';
import type { AttributeType, SceneElement } from './ElementTypes.js';

export interface ElementControlsApi {
  bind(element: SceneElement, onChange: (updated: SceneElement) => void): void;
  clear(): void;
}

type CoercedValue = number | boolean | string;

function coerce(value: string, type: AttributeType): CoercedValue {
  if (type === 'number') return Number(value);
  if (type === 'boolean') return value === 'true';
  return value;
}

function bindOpts(type: AttributeType): Record<string, unknown> {
  if (type === 'number') return { step: 0.01 };
  if (type === 'color') return { view: 'text' };
  return {};
}

export function createElementControls(folder: FolderApi): ElementControlsApi {
  function clear(): void {
    [...folder.children].forEach((b) => {
      b.dispose();
    });
  }

  function bind(element: SceneElement, onChange: (updated: SceneElement) => void): void {
    clear();
    let current = element;
    const labelProxy = { label: element.label };
    folder.addBinding(labelProxy, 'label', { label: 'Name' }).on('change', (ev) => {
      current = { ...current, label: ev.value };
      onChange(current);
    });
    for (const attr of element.parametric_attributes) {
      const proxy: Record<string, CoercedValue> = {
        [attr.attribute_uri_key]: coerce(attr.attribute_value, attr.attribute_type),
      };
      folder
        .addBinding(
          proxy as Record<string, number>,
          attr.attribute_uri_key,
          bindOpts(attr.attribute_type),
        )
        .on('change', (ev) => {
          const newValue = String(ev.value);
          const updated: SceneElement = {
            ...current,
            parametric_attributes: current.parametric_attributes.map((a) =>
              a.id === attr.id ? { ...a, attribute_value: newValue } : a,
            ),
          };
          current = updated;
          onChange(updated);
        });
    }
    for (const fixedAttr of element.fixed_attributes) {
      folder.addBinding(
        { [fixedAttr.attribute_uri_key]: fixedAttr.attribute_value },
        fixedAttr.attribute_uri_key,
        { readonly: true },
      );
    }
  }

  return { bind, clear };
}
