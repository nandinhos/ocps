import { Box, Text } from 'ink';
import React from 'react';

export type StatusType = 'success' | 'error' | 'warning' | 'info';

interface StatusItemProps {
  label: string;
  status: StatusType;
  details?: string;
}

const STATUS_SYMBOLS: Record<StatusType, string> = {
  success: '✓',
  error: '✗',
  warning: '⚠',
  info: '●',
};

const STATUS_COLORS: Record<StatusType, string> = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'blue',
};

export const StatusItem: React.FC<StatusItemProps> = ({ label, status, details }) => {
  const symbol = STATUS_SYMBOLS[status];
  const color = STATUS_COLORS[status];

  return (
    <Box flexDirection="row" gap={1}>
      <Text color={color} bold>
        {symbol}
      </Text>
      <Text>{label}</Text>
      {details && <Text color="gray"> — {details}</Text>}
    </Box>
  );
};
