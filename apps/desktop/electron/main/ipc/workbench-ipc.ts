import { IPC } from "@pi-desktop/shared";
import type { HostProcess } from "../host-process";
import type { IpcRegistrar } from "./types";

export type WorkbenchIpcDependencies = {
  registrar: IpcRegistrar;
  getHost: () => HostProcess | null;
};

/** Register the bounded workbench profile surface owned by host-core. */
export function registerWorkbenchIpc({
  registrar,
  getHost,
}: WorkbenchIpcDependencies): void {
  const call = async <T>(method: string, params: unknown = {}): Promise<T> => {
    const host = getHost();
    if (!host) throw new Error("host unavailable");
    return host.call<T>(method, params);
  };

  registrar.handle(IPC.invoke.workbenchList, () => call("workbenches.list"));
  registrar.handle(IPC.invoke.workbenchCreate, (input) =>
    call("workbenches.create", input),
  );
  registrar.handle(IPC.invoke.workbenchUpdate, (input) =>
    call("workbenches.update", input),
  );
  registrar.handle(IPC.invoke.workbenchActivate, (input) =>
    call("workbenches.activate", input),
  );
  registrar.handle(IPC.invoke.workbenchReorder, (input) =>
    call("workbenches.reorder", input),
  );
  registrar.handle(IPC.invoke.workbenchDelete, (input) =>
    call("workbenches.delete", input),
  );
}
