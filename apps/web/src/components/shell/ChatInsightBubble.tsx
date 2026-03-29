import { Alert, Chip, CircularProgress, Link, Paper, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import type { ReactNode } from 'react';

type Role = 'user' | 'assistant';

type Props = {
  role: Role;
  text: string;
  /** Recordatorio de nómina: "Haz clic aquí" registra el depósito. */
  onRegisterRecurringIncome?: () => void | Promise<void>;
  registering?: boolean;
};

type TextSegment = { type: 'text'; content: string } | { type: 'tip'; content: string };

function splitTipMarkers(text: string): TextSegment[] {
  const parts: TextSegment[] = [];
  const re = /\[\[TIP:([^\]]+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      parts.push({ type: 'text', content: text.slice(last, m.index) });
    }
    parts.push({ type: 'tip', content: m[1].trim() });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    parts.push({ type: 'text', content: text.slice(last) });
  }
  return parts.length ? parts : [{ type: 'text', content: text }];
}

function AssistantMessageWithMarkers({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = /\[\[(VENCE|MONTO):([^\]]+)\]\]/g;
  let key = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(text.slice(last, m.index));
    }
    const kind = m[1];
    const content = m[2].trim();
    if (kind === 'VENCE') {
      nodes.push(
        <Chip
          key={`m-${key++}`}
          label={content}
          size="small"
          color="warning"
          sx={{
            height: 22,
            maxWidth: '100%',
            verticalAlign: 'middle',
            mx: 0.35,
            my: 0.15,
            '& .MuiChip-label': { px: 1, fontSize: '0.7rem', lineHeight: 1.2, whiteSpace: 'normal' },
          }}
        />,
      );
    } else {
      nodes.push(
        <Typography key={`m-${key++}`} component="span" fontWeight={700} sx={{ display: 'inline' }}>
          {content}
        </Typography>,
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    nodes.push(text.slice(last));
  }
  return <>{nodes.length ? nodes : text}</>;
}

function AssistantMessageWithTipsAndMarkers({
  text,
  onRegister,
  registering,
}: {
  text: string;
  onRegister?: () => void | Promise<void>;
  registering?: boolean;
}) {
  const segments = splitTipMarkers(text);
  return (
    <Stack spacing={1.25} sx={{ width: '100%' }}>
      {segments.map((seg, i) => {
        if (seg.type === 'tip') {
          return (
            <Alert
              key={`tip-${i}`}
              severity="success"
              variant="outlined"
              sx={{
                py: 0.75,
                borderColor: 'success.light',
                bgcolor: (t) => t.palette.mode === 'dark' ? 'rgba(46,125,50,0.12)' : 'rgba(46,125,50,0.06)',
              }}
            >
              {seg.content}
            </Alert>
          );
        }
        const t = seg.content;
        if (onRegister && t.includes(REGISTER_MARKER)) {
          return (
            <span key={`txt-${i}`}>
              <AssistantMessageWithRegisterLink
                text={t}
                onRegister={onRegister}
                registering={registering ?? false}
              />
            </span>
          );
        }
        return (
          <span key={`txt-${i}`}>
            <AssistantMessageWithMarkers text={t} />
          </span>
        );
      })}
    </Stack>
  );
}

const REGISTER_MARKER = 'Haz clic aquí';

function AssistantMessageWithRegisterLink({
  text,
  onRegister,
  registering,
}: {
  text: string;
  onRegister: () => void | Promise<void>;
  registering: boolean;
}) {
  const idx = text.indexOf(REGISTER_MARKER);
  if (idx < 0) {
    return /\[\[TIP:/.test(text) ? (
      <AssistantMessageWithTipsAndMarkers text={text} />
    ) : (
      <AssistantMessageWithMarkers text={text} />
    );
  }
  const before = text.slice(0, idx);
  const after = text.slice(idx + REGISTER_MARKER.length);
  return (
    <>
      <AssistantMessageWithMarkers text={before} />
      <Link
        component="button"
        type="button"
        onClick={() => void onRegister()}
        disabled={registering}
        sx={{
          verticalAlign: 'baseline',
          fontWeight: 700,
          cursor: registering ? 'wait' : 'pointer',
        }}
      >
        {registering ? (
          <CircularProgress size={12} sx={{ verticalAlign: 'middle', mr: 0.5 }} />
        ) : null}
        {REGISTER_MARKER}
      </Link>
      {after}
    </>
  );
}

export function ChatInsightBubble({
  role,
  text,
  onRegisterRecurringIncome,
  registering = false,
}: Props) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const isAssistant = role === 'assistant';

  return (
    <Paper
      elevation={0}
      role={isAssistant ? 'status' : undefined}
      aria-live={isAssistant ? 'polite' : undefined}
      sx={{
        maxWidth: '92%',
        alignSelf: isAssistant ? 'flex-start' : 'flex-end',
        px: 2.25,
        py: isAssistant ? 1.75 : 1.5,
        borderRadius: 3,
        ...(isAssistant
          ? {
              borderTopLeftRadius: 6,
              bgcolor: alpha(primary, 0.1),
              border: `1px solid ${alpha(primary, 0.28)}`,
              boxShadow: `0 2px 14px ${alpha(primary, 0.12)}`,
            }
          : {
              borderTopRightRadius: 6,
              bgcolor: alpha(theme.palette.text.primary, 0.05),
              border: `1px solid ${theme.palette.divider}`,
            }),
      }}
    >
      <Typography
        variant="body2"
        component="div"
        sx={{ whiteSpace: 'pre-wrap', fontWeight: isAssistant ? 500 : 400, lineHeight: 1.65 }}
      >
        {isAssistant &&
        (/\[\[TIP:/.test(text) ||
          (onRegisterRecurringIncome != null && text.includes(REGISTER_MARKER))) ? (
          <AssistantMessageWithTipsAndMarkers
            text={text}
            onRegister={onRegisterRecurringIncome}
            registering={registering}
          />
        ) : isAssistant ? (
          <AssistantMessageWithMarkers text={text} />
        ) : (
          text
        )}
      </Typography>
    </Paper>
  );
}
