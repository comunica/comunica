import type { ComunicaDataFactory } from '@comunica/types';
import type * as RDF from '@rdfjs/types';

/**
 * How to merge bindings of one shape with bindings of another shape.
 */
export interface IBindingsMergePlan {
  /**
   * The shape of the merged bindings: the variables of the left shape, followed by the other variables of the right.
   */
  shape: BindingsShape;
  /**
   * Positions in the left values of the variables that both shapes contain.
   */
  overlapLeft: number[];
  /**
   * Positions in the right values of the same variables, in the same order as `overlapLeft`.
   */
  overlapRight: number[];
  /**
   * Positions in the right values of the variables that only the right shape contains.
   */
  extraRight: number[];
}

/**
 * How to keep a subset of the variables of a shape.
 */
export interface IBindingsSubsetPlan {
  /**
   * The shape of the remaining variables.
   */
  shape: BindingsShape;
  /**
   * Positions in the original values of the remaining variables.
   */
  keep: number[];
}

/**
 * The variables of a bindings object, in the order in which its values are stored.
 *
 * Shapes are interned, like hidden classes, so that bindings over the same variables in the same order share
 * a shape, and the plans for merging and subsetting them only have to be computed once per pair of shapes.
 * Shapes are never removed, so once a large number exists, new ones are no longer interned:
 * they still work, but their plans are not shared.
 */
export class BindingsShape {
  public static readonly MAX_INTERNED = 65_536;
  private static interned = 0;
  public static readonly EMPTY: BindingsShape = new BindingsShape([], true);

  /**
   * The variable names, in the order of the values of bindings of this shape.
   */
  public readonly names: readonly string[];
  public readonly size: number;
  private readonly isInterned: boolean;
  private readonly positions: Map<string, number>;
  private readonly appended: Map<string, BindingsShape> = new Map();
  private readonly mergePlans: Map<BindingsShape, IBindingsMergePlan> = new Map();
  private readonly subsetPlans: Map<number, IBindingsSubsetPlan> = new Map();
  private variables: RDF.Variable[] | undefined;

  private constructor(names: readonly string[], isInterned: boolean) {
    this.names = names;
    this.size = names.length;
    this.isInterned = isInterned;
    this.positions = new Map(names.map((name, i) => [ name, i ]));
  }

  /**
   * The shape with the given variable names, in the given order.
   * @param names Distinct variable names.
   */
  public static of(names: readonly string[]): BindingsShape {
    return BindingsShape.appendAll(BindingsShape.EMPTY, names);
  }

  /**
   * The shape with the given variable names added at the end of the given shape.
   * @param shape A shape.
   * @param names Distinct variable names that the shape does not contain.
   */
  public static appendAll(shape: BindingsShape, names: readonly string[]): BindingsShape {
    for (const name of names) {
      shape = shape.append(name);
    }
    return shape;
  }

  /**
   * The position of the given variable, or undefined if this shape does not contain it.
   * @param name A variable name.
   */
  public indexOf(name: string): number | undefined {
    return this.positions.get(name);
  }

  /**
   * The shape with the given variable added at the end.
   * @param name A variable name that this shape does not contain.
   */
  public append(name: string): BindingsShape {
    let shape = this.appended.get(name);
    if (!shape) {
      const interned = this.isInterned && BindingsShape.interned < BindingsShape.MAX_INTERNED;
      shape = new BindingsShape([ ...this.names, name ], interned);
      if (interned) {
        BindingsShape.interned++;
        this.appended.set(name, shape);
      }
    }
    return shape;
  }

  /**
   * The variables of this shape, as RDF/JS terms, which are created once.
   * @param dataFactory The data factory to create variables with.
   */
  public getVariables(dataFactory: ComunicaDataFactory): RDF.Variable[] {
    if (!this.variables) {
      this.variables = this.names.map(name => dataFactory.variable(name));
    }
    return this.variables;
  }

  /**
   * The plan to merge bindings of this shape with bindings of the given shape.
   * @param other Another shape.
   */
  public getMergePlan(other: BindingsShape): IBindingsMergePlan {
    let plan = this.mergePlans.get(other);
    if (!plan) {
      const overlapLeft: number[] = [];
      const overlapRight: number[] = [];
      const extraRight: number[] = [];
      for (let i = 0; i < other.size; i++) {
        const left = this.positions.get(other.names[i]);
        if (left === undefined) {
          extraRight.push(i);
        } else {
          overlapLeft.push(left);
          overlapRight.push(i);
        }
      }
      const shape = BindingsShape.appendAll(this, extraRight.map(i => other.names[i]));
      plan = { shape, overlapLeft, overlapRight, extraRight };
      if (this.isInterned && other.isInterned) {
        this.mergePlans.set(other, plan);
      }
    }
    return plan;
  }

  /**
   * The plan to keep the variables at the given positions.
   * @param keep Positions of variables to keep, in ascending order.
   * @param mask If this shape has at most 31 variables, the bitmask of the positions to keep,
   *             which identifies the plan.
   */
  public getSubsetPlan(keep: number[], mask: number | undefined): IBindingsSubsetPlan {
    let plan = mask === undefined ? undefined : this.subsetPlans.get(mask);
    if (!plan) {
      plan = { shape: BindingsShape.of(keep.map(i => this.names[i])), keep };
      if (mask !== undefined && this.isInterned) {
        this.subsetPlans.set(mask, plan);
      }
    }
    return plan;
  }
}
