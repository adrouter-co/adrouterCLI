const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-([0-9A-Za-z-]+)(?:\.[0-9A-Za-z-]+)*)?$/;

export const PUBLICATION_ORDER = ["@adrouter/ai", "@adrouter/tui", "@adrouter/agent-core", "@adrouter/cli"];

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
		throw new Error(`Publication order must be ${PUBLICATION_ORDER.join(", ")} with @adrouter/cli last`);
	}
	let foundMissing = false;
	for (const state of states) {
		const exists = state.status === "staged" || state.status === "published";
		if (!exists) foundMissing = true;
		if (exists && foundMissing) {
			throw new Error(`Unsafe publication gap: ${state.name} exists before an earlier dependency-stage package`);
		}
	}
}

export function assertResumablePublication(states, version, channel) {
	assertPackageOrder(states);
	for (const state of states) {
		if (state.status === "missing") {
			if (state.tags?.latest === version) throw new Error(`${state.name}@${version} accidentally moved latest`);
			continue;
		}
		if (state.version !== version) throw new Error(`${state.name} has an unexpected existing version`);
		if (!state.metadataMatches) throw new Error(`${state.name}@${version} registry metadata differs from the tagged artifact`);
		if (!state.localIntegrity || state.registryIntegrity !== state.localIntegrity) {
			throw new Error(`${state.name}@${version} registry integrity differs from the tagged artifact`);
		}
		if (state.tags?.latest === version) throw new Error(`${state.name}@${version} prerelease must never move latest`);
		if (state.status === "published" && state.tags?.[channel.tag] !== version) {
			throw new Error(`${state.name}@${version} is published under an incorrect dist-tag`);
		}
		if (state.status === "staged" && state.stageTag !== channel.tag) {
			throw new Error(`${state.name}@${version} is staged under an incorrect dist-tag`);
		}
	}
}
