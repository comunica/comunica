interface LinkedNode<V> {
  value: V;
  next: LinkedNode<V> | null;
}

export default class LinkedList<V> {
  private _length: number = 0;
  private _head: LinkedNode<V> | null = null;
  private _tail: LinkedNode<V> | null = null;

  get length() { return this._length; }
  get first()  { return this._head?.value; }
  get last()   { return this._tail?.value; }
  get empty()  { return this._head === null; }

  push(value: V) {
    const node = { value, next: null } as LinkedNode<V>;
    if (this._tail === null)
      this._head = this._tail = node;
    else
      this._tail.next = this._tail = node;
    this._length++;
  }

  shift(): V | undefined {
    if (this._head === null)
      return undefined;

    const { value, next } = this._head;
    this._head = next;
    if (next === null)
      this._tail = null;
    this._length--;
    return value;
  }

  clear() {
    this._length = 0;
    this._head = this._tail = null;
  }
}
