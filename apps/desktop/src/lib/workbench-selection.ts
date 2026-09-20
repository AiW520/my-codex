export type WorkbenchNavigationContext = {
  workbenchId: string;
  projectPath: string | null;
  sessionId: string | null;
};

export type WorkbenchSelectionDependencies<T> = {
  currentContext: () => WorkbenchNavigationContext | null;
  rememberContext: (context: WorkbenchNavigationContext) => Promise<void>;
  activate: (id: string) => Promise<T>;
  commit: (value: T) => Promise<void> | void;
};

/** Serializes host writes while allowing only the newest UI intent to commit. */
export class WorkbenchSelectionCoordinator<T> {
  private generation = 0;
  private queue = Promise.resolve();
  private readonly dependencies: WorkbenchSelectionDependencies<T>;

  constructor(dependencies: WorkbenchSelectionDependencies<T>) {
    this.dependencies = dependencies;
  }

  select(id: string): Promise<boolean> {
    const token = ++this.generation;
    const run = async (): Promise<boolean> => {
      if (token !== this.generation) return false;
      const current = this.dependencies.currentContext();
      if (current && current.workbenchId !== id) {
        await this.dependencies.rememberContext(current);
      }
      if (token !== this.generation) return false;
      const value = await this.dependencies.activate(id);
      if (token !== this.generation) return false;
      await this.dependencies.commit(value);
      return token === this.generation;
    };
    const result = this.queue.then(run, run);
    this.queue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}
