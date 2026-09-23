<script lang="ts">
	import { formatDate } from '$lib/format';

	let { data, form } = $props();
</script>

<svelte:head><title>Admin · {data.config.siteName}</title></svelte:head>

<div class="row-between wrap">
	<div>
		<h1>Administration</h1>
		<p class="muted">
			Configuration, invitations, access control, legal requests, and audit history.
		</p>
	</div>
	<a class="button" href="/moderation">Open moderation queue</a>
</div>

{#if form?.error}<p class="notice notice-error">{form.error}</p>{/if}
{#if form?.success}<p class="notice notice-success">{form.success}</p>{/if}
{#if form && 'inviteUrl' in form && form.inviteUrl}
	<div class="notice invite-result">
		<strong>One-time invite link</strong>
		<input readonly value={form.inviteUrl} aria-label="Invite link" />
		<small
			>Expires {formatDate(form.inviteExpiresAt)}. This raw token will not be shown again.</small
		>
	</div>
{/if}

<div class="stats">
	<div><strong>{data.stats.users}</strong><span>Users</span></div>
	<div><strong>{data.stats.torrents}</strong><span>Visible torrents</span></div>
	<div><strong>{data.stats.hiddenTorrents}</strong><span>Hidden / removed</span></div>
	<div><strong>{data.stats.openReports}</strong><span>Open reports</span></div>
	<div><strong>{data.stats.openTakedowns}</strong><span>Open notices</span></div>
	<div><strong>{data.stats.activeInvites}</strong><span>Active invites</span></div>
</div>

<div class="admin-grid">
	<section class="panel panel-pad" id="settings">
		<h2>Site settings</h2>
		<p class="small muted">
			Defaults come from <code>config/admin.json</code>. This panel stores validated overrides in
			SQLite.
		</p>
		<form method="POST" action="?/settings" class="stack">
			<div class="grid-2">
				<label
					>Site name<input
						name="siteName"
						value={data.config.siteName}
						required
						maxlength="60"
					/></label
				>
				<label
					>DMCA email<input
						name="dmcaEmail"
						type="email"
						value={data.config.dmcaEmail}
						required
					/></label
				>
			</div>
			<div class="checks">
				<label
					><input
						type="checkbox"
						name="webTorrentEnabled"
						checked={data.config.webTorrentEnabled}
					/> Browser WebTorrent</label
				>
				<span class="small muted">Registration remains invite-only in this release.</span>
			</div>
			<div class="settings-grid">
				<label
					>Items per page<input
						name="itemsPerPage"
						type="number"
						value={data.config.itemsPerPage}
						min="10"
						max="100"
					/></label
				>
				<label
					>Max .torrent bytes<input
						name="maxTorrentFileBytes"
						type="number"
						value={data.config.maxTorrentFileBytes}
						min="1024"
						max="10485760"
					/></label
				>
				<label
					>Max magnet length<input
						name="maxMagnetLength"
						type="number"
						value={data.config.maxMagnetLength}
						min="128"
						max="16384"
					/></label
				>
				<label
					>Max title length<input
						name="maxTitleLength"
						type="number"
						value={data.config.maxTitleLength}
						min="20"
						max="500"
					/></label
				>
				<label
					>Max description length<input
						name="maxDescriptionLength"
						type="number"
						value={data.config.maxDescriptionLength}
						min="100"
						max="20000"
					/></label
				>
				<label
					>Max comment length<input
						name="maxCommentLength"
						type="number"
						value={data.config.maxCommentLength}
						min="50"
						max="5000"
					/></label
				>
				<label
					>Max report length<input
						name="maxReportLength"
						type="number"
						value={data.config.maxReportLength}
						min="50"
						max="5000"
					/></label
				>
				<label
					>Max tags<input
						name="maxTags"
						type="number"
						value={data.config.maxTags}
						min="1"
						max="30"
					/></label
				>
				<label
					>Uploads / hour<input
						name="maxUploadsPerHour"
						type="number"
						value={data.config.maxUploadsPerHour}
						min="1"
						max="100"
					/></label
				>
				<label
					>Uploads / day<input
						name="maxUploadsPerDay"
						type="number"
						value={data.config.maxUploadsPerDay}
						min="1"
						max="1000"
					/></label
				>
				<label
					>Uploads / account<input
						name="maxUploadsPerUser"
						type="number"
						value={data.config.maxUploadsPerUser}
						min="1"
						max="100000"
					/></label
				>
				<label
					>Invite expiry days<input
						name="inviteExpiryDays"
						type="number"
						value={data.config.inviteExpiryDays}
						min="1"
						max="90"
					/></label
				>
				<label
					>Session expiry days<input
						name="sessionExpiryDays"
						type="number"
						value={data.config.sessionExpiryDays}
						min="1"
						max="365"
					/></label
				>
			</div>
			<div><button class="button-primary" type="submit">Save settings</button></div>
		</form>
	</section>

	<section class="panel panel-pad" id="invites">
		<h2>Single-use invitations</h2>
		<form method="POST" action="?/invite" class="row wrap">
			<label
				>Expires in days<input
					name="expiryDays"
					type="number"
					value={data.config.inviteExpiryDays}
					min="1"
					max="90"
				/></label
			>
			<button class="button-primary" type="submit">Create invite</button>
		</form>
		<div class="table-wrap compact-table">
			<table>
				<thead
					><tr
						><th>Created</th><th>Expires</th><th>Creator</th><th>Used by</th><th>State</th><th
						></th></tr
					></thead
				>
				<tbody>
					{#each data.invites as invite}
						<tr>
							<td>{formatDate(invite.createdAt)}</td>
							<td>{formatDate(invite.expiresAt)}</td>
							<td>{invite.creator}</td>
							<td>{invite.consumer ?? '—'}</td>
							<td
								><span class="badge"
									>{invite.revokedAt
										? 'revoked'
										: invite.usedAt
											? 'used'
											: new Date(invite.expiresAt) < new Date()
												? 'expired'
												: 'active'}</span
								></td
							>
							<td>
								{#if !invite.usedAt && !invite.revokedAt}
									<form method="POST" action="?/revokeInvite" class="inline-form">
										<input type="hidden" name="inviteId" value={invite.id} /><button
											class="button-danger small"
											type="submit">Revoke</button
										>
									</form>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>
</div>

<div class="admin-grid">
	<section class="panel panel-pad" id="users">
		<div class="row-between">
			<h2>Users</h2>
			<span class="badge">{data.users.length}</span>
		</div>
		<div class="table-wrap">
			<table>
				<thead><tr><th>User</th><th>Email</th><th>Uploads</th><th>Access</th></tr></thead>
				<tbody>
					{#each data.users as user}
						<tr>
							<td
								><a href={`/users/${user.username}`}>{user.username}</a>
								<div class="small muted">Joined {formatDate(user.createdAt)}</div></td
							>
							<td class="small">{user.email}</td>
							<td>{user.uploads}</td>
							<td>
								<form method="POST" action="?/user" class="access-form">
									<input type="hidden" name="userId" value={user.id} />
									<select name="role" aria-label="Role for {user.username}">
										<option value="user" selected={user.role === 'user'}>User</option>
										<option value="moderator" selected={user.role === 'moderator'}>Moderator</option
										>
										<option value="admin" selected={user.role === 'admin'}>Admin</option>
									</select>
									<select name="status" aria-label="Status for {user.username}">
										<option value="active" selected={user.status === 'active'}>Active</option>
										<option value="suspended" selected={user.status === 'suspended'}
											>Suspended</option
										>
										<option value="banned" selected={user.status === 'banned'}>Banned</option>
									</select>
									<button type="submit">Save</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="panel panel-pad" id="categories">
		<h2>Categories</h2>
		<div class="inline-list category-list">
			{#each data.categories as category}<span class="badge"
					>{category.position}: {category.name}</span
				>{/each}
		</div>
		<form method="POST" action="?/category" class="row wrap">
			<label>Name<input name="name" required maxlength="40" /></label>
			<label>Position<input name="position" type="number" value="100" min="0" max="10000" /></label>
			<button type="submit">Add category</button>
		</form>
	</section>
</div>

<section class="panel panel-pad" id="notices">
	<h2>DMCA and legal notices</h2>
	<div class="table-wrap">
		<table>
			<thead
				><tr><th>Requester</th><th>Target</th><th>Statement</th><th>Status</th><th>Action</th></tr
				></thead
			>
			<tbody>
				{#each data.takedowns as takedown}
					<tr>
						<td
							>{takedown.requesterName}
							<div class="small muted">{takedown.requesterEmail}</div></td
						>
						<td
							>{#if takedown.torrentId}<a href={`/torrents/${takedown.torrentId}`}
									>{takedown.torrentName}</a
								>{:else}{takedown.infoHash ?? takedown.originalUrl}{/if}</td
						>
						<td class="statement">{takedown.statement}</td>
						<td><span class="badge">{takedown.status}</span></td>
						<td>
							<form method="POST" action="?/takedown" class="takedown-form">
								<input type="hidden" name="takedownId" value={takedown.id} />
								<select name="status" aria-label="Takedown status"
									><option value="open">Open</option><option value="reviewing">Reviewing</option
									><option value="resolved">Resolve + remove</option><option value="rejected"
										>Reject</option
									></select
								>
								<input name="note" maxlength="1000" placeholder="Resolution note" />
								<button type="submit">Apply</button>
							</form>
						</td>
					</tr>
				{:else}
					<tr><td colspan="5">No legal notices.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<section class="panel panel-pad" id="audit">
	<h2>Audit log</h2>
	<div class="table-wrap">
		<table>
			<thead
				><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead
			>
			<tbody>
				{#each data.auditLogs as log}
					<tr
						><td>{formatDate(log.createdAt)}</td><td>{log.actor ?? 'system'}</td><td
							><code>{log.action}</code></td
						><td>{log.entityType} {log.entityId ?? ''}</td><td class="small"
							><code>{log.detailsJson}</code></td
						></tr
					>
				{/each}
			</tbody>
		</table>
	</div>
</section>

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(6, minmax(0, 1fr));
		gap: 0.45rem;
		margin-bottom: 0.7rem;
	}
	.stats div {
		display: grid;
		border: 1px solid var(--line);
		background: var(--surface);
		padding: 0.45rem;
		text-align: center;
	}
	.stats strong {
		font-size: 1.15rem;
	}
	.stats span {
		color: var(--muted);
		font-size: 0.68rem;
		text-transform: uppercase;
	}
	.admin-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.7rem;
		margin-bottom: 0.7rem;
		align-items: start;
	}
	.checks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}
	.checks label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
	}
	.checks input,
	.access-form input {
		width: auto;
	}
	.settings-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.45rem;
	}
	.invite-result {
		display: grid;
		gap: 0.3rem;
		margin-bottom: 0.7rem;
	}
	.compact-table {
		max-height: 24rem;
		overflow: auto;
		margin-top: 0.6rem;
	}
	.access-form,
	.takedown-form {
		display: flex;
		min-width: 16rem;
		gap: 0.25rem;
	}
	.access-form select,
	.takedown-form select {
		min-width: 6rem;
	}
	.category-list {
		margin-bottom: 0.7rem;
	}
	.statement {
		max-width: 25rem;
		overflow-wrap: anywhere;
	}
	#notices,
	#audit {
		margin-top: 0.7rem;
	}
	#audit {
		margin-bottom: 1rem;
	}
	@media (max-width: 1100px) {
		.stats {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.admin-grid {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 650px) {
		.settings-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
