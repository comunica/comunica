import type { IMetadataValidationState } from '@comunica/types';

/**
 * Reusable implementation for metadata validation states.
 */
export class MetadataValidationState implements IMetadataValidationState {
  private readonly invalidateListeners: (() => void)[] = [];
  public valid = true;

  /**
   * Registers a listener that is invoked when this state becomes invalid.
   * @param listener The callback to invoke on invalidation.
   */
  public addInvalidateListener(listener: () => void): void {
    this.invalidateListeners.push(listener);
  }

  /**
   * Marks this state as invalid and notifies all registered listeners.
   */
  public invalidate(): void {
    if (this.valid) {
      this.valid = false;
      for (const invalidateListener of this.invalidateListeners) {
        invalidateListener();
      }
    }
  }
}
