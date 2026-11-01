import type { TransformContext } from '@traqula/core';

/**
 * Thrown when the copy-on-write mapper encounters a context that it does not support.
 */
class FallbackError extends Error {}
const KNOWN_CONTEXT_KEYS = new Set([ 'continue', 'shortcut', 'ignoreKeys', 'shallowKeys' ]);

type NodeCallbacks = Record<string, {
  preVisitor?: (op: any) => TransformContext;
  transform?: (copy: any, orig: any) => unknown;
} | undefined>;

type Mapper = (startObject: any, callbacks: any) => any;

export interface ICopyOnWriteMapperOptions<F extends Mapper> {
  defaultObjectContext: TransformContext;
  defaultNodePreVisitor: Record<string, TransformContext | undefined>;
  fallback: F;
}

function cloneObj<T extends object>(obj: T): T {
  const proto = Object.getPrototypeOf(obj);
  if (proto === Object.prototype || proto === null) {
    return { ...obj };
  }
  return Object.assign(Object.create(proto), obj);
}

/**
 * Create a copy-on-write variant of mapOperation.
 * It visits nodes in the same order and calls the same callbacks as traqula's transformNode,
 * but subtrees without changes are reused instead of copied.
 * Nodes that are passed to a transform callback are still fresh shallow copies.
 * For pre-visitor contexts it does not support, it falls back to the given mapper.
 * @param options The default transform contexts, and the original mapper to fall back to.
 */
export function createCopyOnWriteMapper<F extends Mapper>(options: ICopyOnWriteMapperOptions<F>): F {
  const { defaultObjectContext, defaultNodePreVisitor, fallback } = options;
  const defaultIgnore = defaultObjectContext.ignoreKeys;
  const defaultShallow = defaultObjectContext.shallowKeys;

  return <F> ((startObject: any, callbacks: NodeCallbacks): any => {
    if (!(<any> globalThis).__proto?.cow) {
      return fallback(startObject, callbacks);
    }
    let shortcut = false;

    function visitObject(obj: any): any {
      if (shortcut) {
        return obj;
      }
      if (Array.isArray(obj)) {
        let out: any[] | undefined;
        for (const [ i, val ] of obj.entries()) {
          if (val !== null && typeof val === 'object') {
            const mapped = visitObject(val);
            if (mapped !== val) {
              out ??= [ ...obj ];
              out[i] = mapped;
            }
          }
        }
        return out ?? obj;
      }

      const type: string | undefined = obj.type;
      const callback = type ? callbacks[type] : undefined;
      let context: TransformContext = (type ? defaultNodePreVisitor[type] : undefined) ?? defaultObjectContext;
      if (callback?.preVisitor) {
        const extra = callback.preVisitor(obj);
        for (const key in extra) {
          if (!KNOWN_CONTEXT_KEYS.has(key)) {
            throw new FallbackError('Unsupported transform context');
          }
        }
        context = { ...context, ...extra };
      }
      const ignoreKeys = context.ignoreKeys ?? defaultIgnore;
      const shallowKeys = context.shallowKeys ?? defaultShallow;
      if (context.shortcut) {
        shortcut = true;
      }

      // Visit children in reverse key order, as the stack-based original does
      let changes: Record<string, unknown> | undefined;
      if ((context.continue ?? true) && !shortcut) {
        const keys = Object.keys(obj);
        for (let i = keys.length - 1; i >= 0; i--) {
          const key = keys[i];
          if (Boolean(shallowKeys?.has(key)) || Boolean(ignoreKeys?.has(key))) {
            continue;
          }
          const val = obj[key];
          if (val !== null && typeof val === 'object') {
            const mapped = visitObject(val);
            if (mapped !== val) {
              changes ??= {};
              changes[key] = mapped;
            }
          }
        }
      }

      if (!changes && !callback?.transform) {
        return obj;
      }
      const copy = cloneObj(obj);
      if (shallowKeys) {
        for (const key of shallowKeys) {
          if (copy[key] !== null && typeof copy[key] === 'object') {
            copy[key] = cloneObj(copy[key]);
          }
        }
      }
      if (changes) {
        Object.assign(copy, changes);
      }
      return callback?.transform ? callback.transform(copy, obj) : copy;
    }

    try {
      return visitObject(startObject);
    } catch (error: unknown) {
      if (error instanceof FallbackError) {
        return fallback(startObject, callbacks);
      }
      throw error;
    }
  });
}
