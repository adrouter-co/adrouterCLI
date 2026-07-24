const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-([0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?$/;

export const PUBLICATION_ORDER = ["@adrouter/cli"];

export function publicationChannel(version) {
	const match = version.match(SEMVER_PATTERN);
	if (!match) throw new Error(`Invalid SemVer version: ${version}`);
	if (match[1] === undefined) return { prerelease: false, tag: "latest" };
	if (match[1] !== "beta") {
		throw new Error(`Unsupported prerelease channel ${match[1]}; public prereleases must use beta`);
	}
	return { prerelease: true, tag: "beta" };
}

export function assertPackageOrder(states) {
	const names = states.map((state) => state.name);
	if (JSON.stringify(names) !== JSON.stringify(PUBLICATION_ORDER)) {
		throw new Error(`Only ${PUBLICATION_ORDER[0]} may be published`);
	}
}

export function assertResumablePublication(states, version, channel) {
	assertPackageOrder(states);
	const [state] = states;
	if (state.status === "missing") return;
	if (state.status !== "published") throw new Error(`${state.name}@${version} has an unsupported release state`);
	if (state.version !== version) throw new Error(`${state.name} has an unexpected existing version`);
	if (!state.metadataMatches) throw new Error(`${state.name}@${version} registry metadata differs from the tagged artifact`);
	if (!state.localIntegrity || state.registryIntegrity !== state.localIntegrity) {
		throw new Error(`${state.name}@${version} registry integrity differs from the tagged artifact`);
	}
	if (state.tags?.[channel.tag] !== version) {
		throw new Error(`${state.name}@${version} is published under an incorrect beta dist-tag`);
	}
	if (version === "0.81.0-beta.2" && state.tags?.latest !== version) {
		throw new Error(`${state.name}@${version} initial publication must also be latest`);
	}
}
