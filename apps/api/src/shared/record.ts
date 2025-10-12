export class Record<T> {
  constructor(values: T) {
    this.values = values;
  }
  public get<TAttr extends keyof T>(attr: TAttr): T[TAttr] {
    return this.values[attr];
  }
  private values: T;
}
