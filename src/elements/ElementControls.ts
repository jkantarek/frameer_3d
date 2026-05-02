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
    if (element.origin_attributes.length > 0) {
      const positionFolder = folder.addFolder({ title: 'Position' });
      for (const attr of element.origin_attributes) {
        const proxy: Record<string, number> = {
          [attr.dimension_uri_key]: attr.dimension_uri_value,
        };
        positionFolder
          .addBinding(proxy, attr.dimension_uri_key, { step: 0.01 })
          .on('change', (ev) => {
            const updated: SceneElement = {
              ...current,
              origin_attributes: current.origin_attributes.map((a) =>
                a.id === attr.id ? { ...a, dimension_uri_value: ev.value } : a,
              ),
            };
            current = updated;
            onChange(updated);
          });
      }
    }
    if (element.rotation_attributes.length > 0) {
      const rotationFolder = folder.addFolder({ title: 'Rotation' });
      for (const attr of element.rotation_attributes) {
        const proxy: Record<string, number> = {
          [attr.dimension_uri_key]: attr.dimension_uri_value,
        };
        rotationFolder
          .addBinding(proxy, attr.dimension_uri_key, { step: 0.01 })
          .on('change', (ev) => {
            const updated: SceneElement = {
              ...current,
              rotation_attributes: current.rotation_attributes.map((a) =>
                a.id === attr.id ? { ...a, dimension_uri_value: ev.value } : a,
              ),
            };
            current = updated;
            onChange(updated);
          });
      }
    }
  }

  return { bind, clear };
}
