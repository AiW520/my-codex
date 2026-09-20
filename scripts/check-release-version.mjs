function stableVersionOf(version) {
  return version.split("-")[0];
}

export function resolveReleaseVersions(packageVersion, requestedVersion) {
  const catalogVersion = stableVersionOf(requestedVersion ?? packageVersion);
  const surfaceStableVersion = stableVersionOf(packageVersion);
  if (catalogVersion !== surfaceStableVersion) {
    throw new Error(
      `Requested catalog version ${catalogVersion} does not match package version ${packageVersion}.`,
    );
  }
  return {
    surfaceVersion: packageVersion,
    catalogVersion,
    releaseLine: `${catalogVersion.split(".").slice(0, 2).join(".")}.x`,
  };
}
