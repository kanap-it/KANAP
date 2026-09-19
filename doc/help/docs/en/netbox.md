# Netbox synchronisation

[Netbox](https://netboxlabs.com/docs/netbox/) describes your physical and virtual infrastructure: devices, virtual machines, racks, sites, addresses. KANAP reads that inventory and keeps its own assets in step with it.

The split of responsibility is deliberate. Netbox stays the reference for the equipment it describes, so the name, the serial number, the rack position or the primary address always come from there. KANAP keeps the business layer around each asset: environment, applications, contracts and costs, support, dates, relations, notes. You stop retyping the inventory, and you keep everything Netbox does not know about.

## Where to find it

- Workspace: **IT Landscape**
- Path: **IT Landscape > Netbox**
- Route: `/it/netbox`
- Connection settings: **Administration > Integrations**
- Permission: `infrastructure:admin`, for both the connection card and the synchronisation page
- Available in the cloud and in the on-premise edition. There is no feature flag to turn on.

---

## Before you start

**A Netbox instance KANAP can reach.** KANAP calls Netbox from the server, not from your browser. The address you enter has to resolve and answer from wherever KANAP runs. In the cloud edition, that address must be a public one: a private or internal address is refused when you save the connection, and again before every call. In the on-premise edition, an address on your own network is exactly what is expected.

**An API token with read access.** In Netbox, open the user menu at the top right, then **API tokens**, and create one. A read-only token is enough: KANAP never writes anything back to Netbox. Give the token a description so you can recognise it later, and rotate it the same way you would any other service credential.

**A decision about the certificate.** If your Netbox uses a certificate KANAP does not trust, typically a self-signed or internal certificate, you can turn on **Ignore certificate errors**. The connection stays encrypted, but the certificate is no longer checked, so use it only for a certificate you know and trust on a network you control. On a public Netbox, install a trusted certificate instead.

---

## Connect KANAP to Netbox

Go to **Administration > Integrations** and open the **Netbox inventory** card.

| Field | What to enter |
|-------|---------------|
| **Enable Netbox synchronisation** | The master switch. When it is off, KANAP never calls Netbox, by hand or on a schedule. |
| **Netbox address** | The address you use to open Netbox in a browser, for example `https://netbox.example.com`. |
| **API token** | The token you created in Netbox. It is stored encrypted and never shown again. Leave the field empty when saving to keep the token already stored. |
| **Request timeout (seconds)** | How long to wait for Netbox before giving up, between 5 and 120. Leave it empty to use 30. |
| **Ignore certificate errors** | Off by default. See above. |
| **Automatic synchronisation** | Runs every hour and applies the changes on its own. Leave it off until your first run looks right. |
| **Environment for new assets** | Applied to the assets this integration creates. It is never changed afterwards. |

**Test connection** makes a read-only call and reports the Netbox version it found, or the reason it failed. Run it after every change to the address or the token. Once the settings are saved, the card offers a link to **Set up the synchronisation**, which takes you to **IT Landscape > Netbox**.

---

## Choose what is imported

Open the **Mappings** tab on the Netbox page. Two tables decide the whole scope of the import.

- **Netbox roles > KANAP asset type**. Each device role Netbox knows about gets an asset type, or **Do not import**.
- **Netbox sites > KANAP location**. Each Netbox site gets one of your locations, or **Do not import**.

Anything left on **Do not import** is skipped: its objects are never created, never updated, and never reported as missing. That is how you keep power strips, patch panels or a lab site out of KANAP while still importing the servers next to them.

One extra row sits with the roles: **Virtual machines**. Every virtual machine Netbox holds goes through that single row, whatever role Netbox gives it, so one decision covers the lot. A virtual machine takes its site from its cluster when it does not carry one itself.

Each row shows how many devices and virtual machines it covers, so you can see what a choice is about to bring in. When a Netbox name clearly matches one of yours, the row is pre-filled and marked **Suggested**. A suggestion is only a proposal: nothing is used until you press **Save mappings**.

---

## The first synchronisation

Press **Synchronise now**. KANAP reads Netbox and shows **Review before applying** before writing anything.

The preview is grouped:

- **To create**: objects with no counterpart in KANAP. They will be created.
- **To update**: objects matched to an existing asset that differs. Nothing is changed yet, the values are written when you apply. Each one lists the fields that change, field by field, as `before → after`.
- **Needs a decision**: objects KANAP will not decide on its own. Nothing happens to them until you settle them, here or later on the page.
- **Skipped**: objects out of scope, counted by reason (role not mapped, site not mapped, no name in Netbox, ignored by you).
- **Missing from Netbox**: assets a previous run linked whose Netbox object is gone.
- **Warnings**: values Netbox reports that KANAP could not take over, for example an operating system that is not in your catalogue. An object with nothing to change but something to report appears here too.

Read it, then press **Apply**. Objects that are already identical are counted as unchanged and not touched at all. Large inventories list only the first 500 rows in the preview; the run itself applies everything. The filter at the top narrows the list to an object or an asset name.

### Correct the preview before applying

KANAP can only recognise an asset through its serial number, its host name or its name. Equipment you renamed, with none of these in common, shows up under **To create** and would be created a second time. The preview lets you settle that first. A row KANAP proposes something for has a button, **Correct** under **To create** and **To update**, **Decide** on objects that need a decision. An object already linked by an earlier run has none: it is settled, and the row only shows what changes. A first match says what it rests on ("Recognised by its serial number"), so you can tell a wrong one. The button opens these choices:

- **Link to an existing asset**: search for the asset and pick it. The row moves to **To update** and shows what Netbox will change on that asset, field by field, so you still read before you apply.
- **Create a new asset**: for an object under **Needs a decision**, or one KANAP matched to the wrong asset.
- **Do not import this object**: the object is left out of this synchronisation and the next ones. Nothing happens to any asset. It moves to **Settled by you** in the preview and, once applied, to **Ignored** on the page, where you can take it back later.

A row you decided on says so and offers **Undo**. When several objects under **Needs a decision** have a single suggested asset, **Link the N objects that have a single suggestion** settles them all at once. They move to **To update**, where you read what changes before applying.

Nothing is written while you decide. Your choices are applied with everything else when you press **Apply**, and they hold afterwards: the automatic synchronisation follows the links you made. Closing the preview discards them.

Applying runs in the background. The page follows it and refreshes on its own when it finishes.

---

## How objects are matched to existing assets

A first import into a populated KANAP has to find the assets you already have instead of duplicating them. KANAP tries four things, in order, and stops at the first one that finds anything:

1. **An existing link**. The object was already matched to an asset on a previous run.
2. **The serial number**. This survives a rename on either side.
3. **The host name**. A short name and a full name are treated as the same machine, so `par-esx-01` in KANAP matches `par-esx-01.example.com` in Netbox.
4. **The asset name**, ignoring case and the domain suffix.

If a step finds exactly one asset, that is the match. If it finds several, KANAP stops there and files the object under **To decide** with the candidates listed. It never merges on a guess.

**The IP address is a safety net, never a match.** When none of the four steps finds anything, KANAP checks whether an asset already holds the object's primary address. If one does, the object is not created: it goes to **To decide** with that asset as the suggestion, and you confirm whether it is the same equipment. An address alone never links anything, even when a single asset holds it. Addresses are reused, shared between cluster members, or simply out of date, and a wrong link would let Netbox overwrite the wrong asset. The automatic synchronisation follows the same rule, so a new Netbox device on a known address waits for you instead of becoming a duplicate.

Two further rules keep the result clean:

- **One asset belongs to one Netbox object**, and the other way round. The database enforces it. An asset another object already owns is out of reach for everything else, and linking an asset that is already taken is refused with a message naming the object holding it. If two Netbox objects reach the same free asset, both are sent to you for a decision.
- **A device deleted and recreated in Netbox is picked up again.** It comes back with a new Netbox identifier, so the old record becomes missing, releases its asset, and the new object takes it over by host name in the same run. If another object took that asset over in the meantime, the returning device is judged like a new object.

---

## Which fields Netbox manages

| Managed by Netbox | Stays yours in KANAP |
|-------------------|----------------------|
| Name | Environment |
| Host name and domain | Notes and description |
| Serial number | Dates, support and warranty |
| Manufacturer and model | Contracts and costs |
| Rack and rack unit | Applications hosted on the asset |
| Primary IP address | Connections and other relations |
| Operating system | Attachments, tasks, incidents |
| Lifecycle status | Everything else on the asset |
| Location | |

On an asset that is linked to Netbox, the managed fields are shown as **Managed by Netbox** and cannot be edited in KANAP. Change them in Netbox and the next run brings them over. Everything else on the asset stays editable as usual.

The asset page also carries a **Source** line: when the last synchronisation happened, a link to **Open in Netbox**, and a warning when the object is no longer there.

### Rules worth knowing

**An empty Netbox value never erases a KANAP value.** If Netbox has no serial number and KANAP has one, the serial number is kept. Only a value Netbox actually holds is written.

**Manual edits are corrected.** Each run compares against the real values on the asset, so a managed field changed in KANAP some other way is put back in line at the next run.

**Renaming is understood.** A difference in case, or a domain suffix, is not a rename. `PAR-ESX-01` and `par-esx-01.example.com` are the same machine as `par-esx-01`.

**Lifecycle follows a fixed table.**

| Netbox status | KANAP lifecycle |
|---------------|-----------------|
| Planned, Staged, Inventory | Proposed |
| Active, Offline, Failed, Paused | Active |
| Decommissioning | Deprecated |
| Anything else | Left unchanged, with a warning |

**Offline, Failed and Paused stay visible.** The lifecycle remains Active, because the equipment is still in service on paper. KANAP keeps the Netbox status and shows it as a notice: on the asset, next to its source ("Netbox status: Failed"), in the **Linked** list, and under **Warnings** in the preview. Changing only this status in Netbox never rewrites the asset.

A synchronisation never sets an asset to **Retired**. Retiring equipment is a decision you take, from the **Missing from Netbox** list.

**Environment is set once.** New assets get the environment chosen on the integration card. Later runs never touch it, so you can correct it in KANAP and it stays corrected.

**Values KANAP does not know are skipped, never invented.** An operating system, a domain suffix or a lifecycle that has no entry in **IT Landscape > Settings** is left unchanged and reported as a warning. Add the entry there and run again. An IPv6 primary address is left out the same way, with the notice "The primary address is an IPv6 address, which is not imported yet."

**A new asset takes the provider of its location** when that provider exists in your IT settings, and "Other" otherwise. Netbox has no notion of a hosting provider.

**A run that keeps failing stops.** After 10 objects in a row fail to save, the run stops and is reported as failed, instead of filling the list with error rows and then claiming success.

**A partial read never marks anything missing.** If Netbox holds more pages than KANAP reads in one run, nothing is reported as missing and a notice sits next to the result.

**A server restart does not block the page.** **Synchronise now** works again straight away; a run cut short by the restart is reported as stopped without finishing.

---

## Automatic synchronisation

Turn **Automatic synchronisation** on in the integration card and KANAP runs the same job every hour, applying the changes without a preview. The switch is per tenant, and only tenants that turned it on are visited. The hourly job never does the first import: it starts once you have applied a synchronisation yourself and it finished without error. Until then the switch can be on and nothing runs.

Objects that need a decision are never resolved automatically. They pile up under **To decide** and wait for you.

A manual run and a scheduled run cannot overlap: if one is already going, the other does nothing for that tenant and tries again later. In the cloud edition, a tenant whose subscription is frozen or whose trial has expired is skipped until the subscription is sorted out. On-premise installs are not concerned.

---

## The management page

**IT Landscape > Netbox** is where the work happens after the connection is set up. The strip at the top shows the last run: when it happened, whether it was started by hand or automatically, how long it took, its result, and how many objects are linked or need attention.

Below it, the **Objects** tab lists every Netbox object in scope, filtered by state.

| State | What it means | What you can do |
|-------|---------------|-----------------|
| **To decide** | Several assets could be this object, two objects reached the same asset, or an asset already holds the object's IP address. | **Link to...** one of the candidates, **Create new asset**, or **Ignore**. |
| **Missing from Netbox** | The object is gone from Netbox. The asset is untouched. | **Mark asset as retired**, **Ignore**, or leave it. |
| **Errors** | The object could not be written, with the reason in the message column. | Fix the cause and run again, or **Ignore** the object. |
| **Ignored** | You told KANAP to leave this object alone. It is skipped by every run. | **Stop ignoring** puts it back in the list. When the record holds nothing to decide, it is removed instead and the object is judged afresh at the next synchronisation. |
| **Linked** | The object and the asset are matched and up to date. | Open either side from the row. |

Each row links to the object in Netbox and to the asset in KANAP, with its `AST-` reference.

Linking or creating from this page applies the Netbox values straight away. It reads that one object from Netbox, so it stays quick on a large inventory. Messages and warnings are shown in your own language.

### Missing from Netbox

**KANAP never deletes an asset.** When an object disappears from Netbox, the asset, its links and its history stay exactly as they are, and the object is listed as missing so that you can decide. **Mark asset as retired** sets the lifecycle to Retired and keeps everything else.

Two safeguards apply. Nothing is reported as missing when the call to Netbox failed, or when Netbox returned an empty inventory: an outage is not a decommissioning. And an asset whose Netbox object disappeared is free again, so the same machine recreated in Netbox links back to it instead of creating a duplicate.

---

## The home dashboard tile

A **Netbox synchronisation** tile is available on your personal dashboard. It is off by default. Turn it on from the dashboard settings, the gear icon on **Dashboard**, and tick **Netbox synchronisation**. The tile needs `infrastructure:admin`, like the rest of the integration.

The tile stays out of the way when there is nothing to do: one line saying the synchronisation is up to date, with the time of the last run. When something needs attention, it lists only what does, objects to decide, assets missing from Netbox, errors, or a failed run, and each line opens the matching filtered list.

---

## Troubleshooting

| What you see | What it usually means |
|--------------|-----------------------|
| Netbox rejected the API token | The token was truncated when pasted, has expired, or is restricted to another address. Create a fresh one in Netbox and save it again. |
| Private or internal hosts are not allowed | The cloud edition only reaches public addresses. Either publish Netbox at an address KANAP can reach, or run KANAP on-premise next to it. |
| The certificate could not be verified | Netbox presents a certificate KANAP does not trust. Install a trusted certificate, or turn on **Ignore certificate errors** if the certificate is one of yours. |
| The Netbox server did not answer in time | Netbox is slow, unreachable, or behind a firewall that drops the call. Check from the KANAP server, then raise the request timeout if the instance is simply large. |
| Objects show as skipped, reason "Role not mapped" or "Site not mapped" | Expected for anything you left on **Do not import**. If it was not meant to be skipped, map the role or the site and run again. |
| A warning says an operating system is not in your catalogue | The Netbox platform has no matching entry in **IT Landscape > Settings**. Add it there and run again; the field is left unchanged until you do. |
| The run failed after a handful of objects | Ten objects in a row could not be saved, so the run stopped. The cause is usually the same for all of them, and the details are in the server log. |
| "Netbox returned more pages than expected. Some objects were not looked at." | The inventory is larger than one run reads. What was read is applied, and nothing is marked missing. Narrow the scope in **Mappings** so the run covers what matters to you. |

---

## Tips

- **Map first, synchronise second.** The mapping is the scope. Start with the roles and sites you are sure about, run once, and widen it afterwards.
- **Read the preview on the first run.** It is the only run where every match is new, so it is the one worth reading line by line.
- **Renamed equipment: check the To create list.** Anything you recognise there is about to be duplicated. Link it to its asset in the preview, or fill in its serial number or host name in KANAP and open the preview again.
- **Fill in the serial numbers.** It is the sturdiest match there is. Assets that carry a serial number survive renames on both sides without ever landing in **To decide**.
- **Wait before turning the hourly run on.** Two clean manual runs in a row, the second one showing nothing to change, means the mapping and the matches are right.
