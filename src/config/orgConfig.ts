export interface OrgConfig {
  points: {
    knowIt: number; // Know it has no points (0)
    guideMeFirstTry: number; // Guide me 10 first try
    guideMeWithMistakeOrHint: number; // 5 with a wrong tap or hint
  };
  mastery: {
    testMeScoreThreshold: number; // Test me >= 80% (0.8)
    safetyComplianceThreshold: number; // 100% on safety/compliance steps (1.0)
  };
  skipRule: {
    diagnosticPassThreshold: number; // Diagnostic >= 75% (0.75)
    alwaysShowCards: string[]; // always_show cards shown once per learner per process
  };
  handoffTriggers: {
    manualTap: boolean; // Learner taps "Ask my trainer"
    unanswerableQuestion: boolean; // Ask question not answerable from approved content
    safetyStepMissedLimit: number; // Safety/compliance step missed twice (2)
    consecutiveWrongTapsLimit: number; // 3 wrong taps in a row
    maxUnmasteredTestAttempts: number; // Not mastered after 2 test attempts
  };
}

export const ORG_CONFIG: OrgConfig = {
  points: {
    knowIt: 0,
    guideMeFirstTry: 10,
    guideMeWithMistakeOrHint: 5,
  },
  mastery: {
    testMeScoreThreshold: 0.8, // 80%
    safetyComplianceThreshold: 1.0, // 100% on safety/compliance steps
  },
  skipRule: {
    diagnosticPassThreshold: 0.75, // 75%
    alwaysShowCards: ['safety_rules', 'ppe_standards'],
  },
  handoffTriggers: {
    manualTap: true,
    unanswerableQuestion: true,
    safetyStepMissedLimit: 2,
    consecutiveWrongTapsLimit: 3,
    maxUnmasteredTestAttempts: 2,
  },
};
