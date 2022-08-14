interface ILinkedNode<V> {
  value: V;
  next: ILinkedNode<V> | null;
}

export default class LinkedList<V> {
  private _length = 0;
  private _head: ILinkedNode<V> | null = null;
  private _tail: ILinkedNode<V> | null = null;

  public get empty(): boolean {
    return this._head === null;
  }

  public push(value: V): void {
    const node = { value, next: null };
    if (this._tail === null) {
      this._head = this._tail = node;
    } else {
      this._tail.next = this._tail = node;
    }
    this._length++;
  }

  public shift(): V | undefined {
    const { value, next } = this._head!;
    this._head = next;
    if (next === null) {
      this._tail = null;
    }
    this._length--;
    return value;
  }
}
