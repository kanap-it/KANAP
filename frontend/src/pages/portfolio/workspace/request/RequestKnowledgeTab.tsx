import React from 'react';
import EntityKnowledgePanel from '../../../../components/EntityKnowledgePanel';

type RequestKnowledgeTabProps = {
  canCreate: boolean;
  entityId: string;
};

export default function RequestKnowledgeTab({
  canCreate,
  entityId,
}: RequestKnowledgeTabProps) {
  return (
    <EntityKnowledgePanel
      entityId={entityId}
      entityType="requests"
      canCreate={canCreate}
    />
  );
}
