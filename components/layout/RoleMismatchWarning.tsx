import { useState } from 'react';
import { useRouter } from 'next/router';
import styles from '@/styles/Dashboard.module.css';

interface RoleValidation {
  isRelevant: boolean;
  confidence: number;
  suggestions: string[];
  selectedRole: string;
}

interface RoleMismatchWarningProps {
  contractType: string;
  roleValidation: RoleValidation;
  documentId: string;
}

const RoleMismatchWarning: React.FC<RoleMismatchWarningProps> = ({
  contractType,
  roleValidation,
  documentId
}) => {
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();

  // Don't show warning if role is relevant or already dismissed
  if (roleValidation.isRelevant || dismissed) {
    return null;
  }

  const handleReanalyze = () => {
    // Redirect to upload page with the document ID for re-analysis
    router.push(`/upload?reanalyze=${documentId}`);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const formatContractType = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatRole = (role: string) => {
    return role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={styles.roleMismatchWarning}>
      <div className={styles.warningIcon}>⚠️</div>
      <div className={styles.warningContent}>
        <h4>Potential Role Mismatch Detected</h4>
        <p>
          This appears to be a <strong>{formatContractType(contractType)}</strong> contract, 
          but you selected "<strong>{formatRole(roleValidation.selectedRole)}</strong>" as your role. 
          This may lead to inaccurate clause analysis.
        </p>
        
        {roleValidation.suggestions.length > 0 && (
          <>
            <p>For this contract type, you might be the:</p>
            <div className={styles.suggestedRoles}>
              {roleValidation.suggestions.map((suggestion, index) => (
                <span key={index} className={styles.suggestedRole}>
                  {formatRole(suggestion)}
                </span>
              ))}
            </div>
          </>
        )}
        
        <div className={styles.warningActions}>
          <button 
            className={styles.reanalyzeButton}
            onClick={handleReanalyze}
          >
            Re-analyze with correct role
          </button>
          <button 
            className={styles.dismissButton}
            onClick={handleDismiss}
          >
            Dismiss warning
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleMismatchWarning; 