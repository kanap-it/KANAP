import React from 'react';
import EntityKnowledgePanel from '../../../../components/EntityKnowledgePanel';

type ProjectKnowledgeTabProps = {
  canCreate: boolean;
  entityId: string;
};

export default function ProjectKnowledgeTab({
  canCreate,
  entityId,
}: ProjectKnowledgeTabProps) {
  return (
    <EntityKnowledgePanel
      entityType="projects"
      entityId={entityId}
      canCreate={canCreate}
    />
  );
}
