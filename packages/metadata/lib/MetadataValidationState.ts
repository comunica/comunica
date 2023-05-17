import type { IMetadataValidationState } from '@comunica/types';

/**
 * Reusable implementation for metadata validation states.
 */
export class MetadataValidationState implements IMetadataValidationState {
  private readonly invalidateListeners: (() => void)[] = [];
  public valid = true;

  public addInvalidateListener(listener: () => void): void {
    this.invalidateListeners.push(listener);
  }

  public invalidate(): void {
    if (this.valid) {
      this.valid = false;
      for (const invalidateListener of this.invalidateListeners) {
        invalidateListener();
      }
    }
  }
}
