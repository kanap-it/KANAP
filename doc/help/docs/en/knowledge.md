# Knowledge

Knowledge is KANAP's document workspace for policies, procedures, technical notes, reference material, and the documentation that needs to stay connected to real work. It combines free-form writing with governance features such as templates, ownership, review, version history, and relations to applications, assets, projects, requests, and tasks.

Unlike a file share, Knowledge is not just a place to store documents. The important design choice is that every article can be classified, reviewed, versioned, exported, and linked to operational objects across the platform. That makes the article easier to find and gives it context when people open it from another workspace.

## Where to find it

- Workspace: **Knowledge**
- Permissions:
  - `knowledge:reader` lets you open and read documents
  - `knowledge:member` lets you create, edit, comment, organize folders, and manage document metadata
  - `knowledge:admin` adds library administration and cross-library moves

If you can read a document but cannot edit it, the workspace stays available in read-only mode.

## How Knowledge is organized

Knowledge is built around four layers of organization: libraries, folders, document types, and relations.

### Libraries

Libraries are the highest-level containers. They separate document populations that should be managed differently.

Typical patterns:
- Use a regular library for your team's working knowledge base.
- Use the **Templates** library for reusable document starters.
- Use the **Managed Docs** library for documents that originate from another workspace and remain partly controlled there.

Consequences of the library choice:
- The active library determines which folder tree you see and where new blank documents are created.
- In a normal library, documents behave like standard knowledge articles.
- In **Templates**, published documents become reusable starting points for new articles and are grouped by document type in the template picker.
- In **Managed Docs**, articles may still be readable and editable, but some metadata is controlled by the source workspace rather than from Knowledge itself.

Library administration is intentionally stricter than document editing. Creating, renaming, deleting, or reorganizing libraries is an admin responsibility because those changes affect navigation and ownership for everyone.

### Folders

Folders organize documents inside a library. They are not cosmetic: they shape how users browse the library and how teams maintain a shared structure over time.

Important behavior:
- Folders exist inside one library. They are not shared across libraries.
- In a single-library view, documents can be dragged into folders for quick reorganization.
- Folders can be nested to create a browsing structure.
- Deleting a folder does not delete its documents. Documents move back to **Unfiled** instead.
- A folder with subfolders cannot be deleted until the hierarchy is cleaned up.

Use folders for stable subject areas, not for temporary workflow states. Status and workflow already exist for that.

### Scope filters

The top-level scope filter changes which documents are listed:

- **My docs** focuses on documents you own.
- **My team's docs** focuses on documents owned by your team.
- **All docs** removes the ownership scope and shows the full population you are allowed to see.

If you are not assigned to a team, the team scope is unavailable. Your last scope choice is remembered, which is convenient when it matches your normal working mode and slightly confusing when you forget you changed it yesterday.

### Templates and document types

Templates are ordinary Knowledge documents stored in the **Templates** library and published for reuse. Creating a document from a template copies the template content into a new article and preserves the template reference.

Document types matter because they:
- classify the article for filtering and reporting
- group templates in the creation picker
- help readers understand what kind of document they are opening

One subtle but important behavior: if a document was created from a template and you later change its document type to a different type, the template link is cleared. That prevents the article from pretending it still follows a template it no longer matches.

### Managed documents

Some Knowledge articles are created from Requests, Projects, Applications, Assets, or Tasks. These appear as **Integrated** documents.

Managed documents keep the writing experience inside Knowledge, but the source workspace continues to control part of their metadata. In practice, that means:
- status may be controlled by the source object
- folder placement may be fixed by the source workspace
- document type or template may be fixed
- direct relations may be read-only in Knowledge
- the Knowledge review workflow is not available for these documents
- managed documents cannot be moved out of Knowledge or deleted from the Knowledge list

This protects the link between the document and the operational record that owns it.

## Working with the Knowledge list

The main Knowledge page is a document register with navigation and organization tools around it.

### What the list shows

The default grid focuses on document identity and governance:

- **Ref**: the permanent `DOC-{number}` reference
- **Title**
- **Status**
- **Type**
- **Version**
- **Owner**
- **Folder**
- **Updated**

When you switch to **All libraries**, the **Library** column becomes useful because you are no longer browsing a single library tree.

### Search, filters, and browsing

Knowledge supports two navigation styles:

- Browse one library with its folder tree when you already know the subject area.
- Search across all libraries when you care more about the article than its storage location.

The **All libraries** switch changes the experience significantly:
- the folder tree is no longer the main driver
- search becomes broader
- the list can compare content across libraries
- the Library column becomes part of the result context

Single-library browsing is better for curation. All-library search is better for retrieval.

### Moving documents and folders

In a single-library view, documents can be dragged into folders. This is the fastest way to tidy a library without opening every article.

Cross-library moves are more controlled:
- they require higher permission
- they are not available for managed documents
- template documents are intentionally restricted because templates are meant to stay in the template system, not wander off into the wild

Folder moves follow the same idea. Reorganizing a folder changes the browsing structure for everyone using that library, so treat it as an information architecture change, not just personal housekeeping.

## Creating and shaping a document

New articles can start in two ways:

- **Blank document**: best when you already know the structure you need
- **From template**: best when the team wants consistent sections, language, or review expectations

When you create from a template, the template content is copied into the new document. From that point on, the new article is independent. Updating the template later does not rewrite existing documents.

The document workspace keeps writing in the center and governance in the sidebar.

Core properties include:
- **Title**: the primary label readers will search for and cite
- **Status**: the lifecycle of the article
- **Folder**: where the article lives within its library
- **Type**: what kind of document it is
- **Based on template**: the template lineage, when relevant
- **Summary**: a short description for context

After the first save, the full document governance model becomes available. That is when you can manage contributors, classifications, relations, comments, and version history against a stable document reference.

### Status and what it means

Status is not decoration. It tells readers how seriously they should treat the article.

| Status | Meaning | Practical consequence |
|--------|---------|-----------------------|
| **Draft** | Work in progress | Suitable for authorship and internal iteration |
| **In Review** | Under formal review | Editing is blocked while the workflow is active |
| **Published** | Approved for normal use | Best choice for content people should rely on |
| **Archived** | Kept for record | Usually still useful for history, not for active guidance |
| **Obsolete** | Superseded or no longer valid | Readers should not follow it as current practice |

Knowledge allows direct publishing even without a formal review workflow. That is useful for low-risk material, but it also means teams need discipline about when review is optional and when it should be expected.

## Writing, locks, and autosave

Knowledge uses an edit lock so only one person actively edits a document at a time.

How it works:
- entering edit mode acquires the lock
- other users can still open and read the article
- they cannot edit while the lock is held by someone else
- if the lock expires or is lost, edit mode stops and must be re-entered

This avoids silent overwrites, which is excellent for document integrity and less excellent if two people both thought they had "just one quick tweak."

While you are editing:
- changes are saved manually with **Save**
- unsaved content is also autosaved periodically while your lock is active
- **Discard** returns to the last saved state

The workspace also supports inline image upload inside the markdown content area, so screenshots and diagrams can live with the article rather than in a mysterious folder on somebody's desktop.

## Contributors and review workflow

Every document can have a structured contributor model:

- **Owner**: the accountable person for the article
- **Authors**: people who help maintain the content
- **Reviewers**: stage 1 reviewers
- **Approvers**: stage 2 approvers

The owner matters operationally. Scope filtering is based on ownership, and a document without a clear owner is much more likely to become "important background material" that nobody updates.

### Review workflow

The review workflow is optional but deliberate:

- reviewers work first
- approvers act after the review stage is complete
- approvers and reviewers can record decision notes
- requesting changes sends the document back for revision
- the workflow keeps track of the last approved revision

Important consequences:
- you cannot request review while there are unsaved changes
- you need assigned reviewers or approvers before a review can be requested
- archived and obsolete documents are not candidates for a new review request
- once review starts, normal editing is disabled until the review is approved, changes are requested, or the review is cancelled

This makes review meaningful. If authors could keep editing the content during approval, the approved document would be a moving target, which is a splendid way to create arguments and a poor way to create documentation.

## Versions, comments, and activity

### Versions

Knowledge keeps a version history for saved documents. The Versions section shows the saved states and when they were created.

Reverting is available only while you are actively editing with a valid lock. That is intentional: restoring an earlier version is an editorial action, not a browsing shortcut.

Use versions when:
- a recent rewrite went too far
- a previously approved structure needs to be restored
- you need to recover from enthusiastic experimentation

### Comments and activity

The sidebar separates **Properties** from **Comments**.

The Comments area is not just for discussion. It also gives visibility into activity around the document, so readers and contributors can understand what happened, who said what, and when. Use comments for review context, editorial clarification, or change rationale that should stay attached to the article.

## Relations and cross-workspace context

Knowledge documents can be related directly to:

- Applications
- Assets
- Projects
- Requests
- Tasks

Relations are not just tags. They control where the document appears elsewhere in KANAP and how users discover it from operational workspaces.

Consequences of adding relations:
- the document becomes easier to find from the linked object
- readers opening the object get contextual documentation without having to search manually
- reporting and governance around the object become more complete

Consequences of poor relations:
- useful documents stay invisible outside Knowledge
- users create duplicates because they cannot find the existing article
- the same subject starts drifting across multiple documents

In related workspaces, Knowledge panels distinguish between:
- **Linked documents**: directly attached to the object
- **Related documents**: surfaced through context and provenance from connected work

That distinction matters. Direct links express an intentional relationship. Related documents express useful context, but not the same level of ownership.

## Export formats

Knowledge articles can be exported as:

- **PDF**
- **DOCX**
- **ODT**

Export is available when the article has content. This is useful when:
- a document needs to circulate outside KANAP
- a reviewer prefers Word-format markup
- a stable PDF snapshot is needed for sharing or recordkeeping

Export does not replace the live article. The Knowledge version remains the governed source, while exported files are distribution formats.

## Good operating habits

- Use libraries for governance boundaries, folders for navigation, and relations for business context.
- Keep ownership current. A good article with the wrong owner is usually living on borrowed time.
- Use templates when consistency matters across teams.
- Use review for documents that drive decisions, controls, or repeatable processes.
- Mark outdated content as archived or obsolete instead of leaving readers to guess.
