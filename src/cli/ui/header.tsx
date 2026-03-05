import { Box, Text } from 'ink';
import React from 'react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle }) => {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" padding={1}>
      <Text bold color="cyan">
        {title}
      </Text>
      {subtitle && <Text color="gray">{subtitle}</Text>}
    </Box>
  );
};
