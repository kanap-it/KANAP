import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import logoSrc from '../assets/cioAssistantLogo.svg';

interface AuthFrameProps {
  heading?: string;
  children: ReactNode;
}

export default function AuthFrame({ heading = 'Welcome back!', children }: AuthFrameProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        bgcolor: (theme) => theme.palette.grey[100],
      }}
    >
      <Box
        component="header"
        sx={{
          bgcolor: (theme) => theme.palette.primary.main,
          color: (theme) => theme.palette.primary.contrastText,
          height: 100,
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          px: { xs: 2.5, sm: 4 },
        }}
      >
        <Box
          component="img"
          src={logoSrc}
          alt="cio-assistant"
          sx={{
            width: 80,
            height: 80,
            objectFit: 'contain',
          }}
        />
        <Typography
          variant="h5"
          fontWeight={600}
          sx={{
            textAlign: 'center',
            fontSize: { xs: '1.35rem', md: '1.6rem' },
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {heading}
        </Typography>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          px: 2,
          pt: 'calc(25vh - 60px)',
          pb: { xs: 4, md: 6 },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
