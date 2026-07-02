import { useTranslation } from 'react-i18next';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

// EN/FR toggle — Cameroon is bilingual, so the choice is always one click away
export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language.startsWith('fr') ? 'fr' : 'en';

  return (
    <ToggleButtonGroup
      size="small"
      exclusive
      value={current}
      onChange={(_e, lang: string | null) => {
        if (lang) void i18n.changeLanguage(lang);
      }}
      sx={{
        mr: 2,
        '& .MuiToggleButton-root': {
          color: 'inherit',
          borderColor: 'rgba(255,255,255,0.4)',
          px: 1.25,
          py: 0.25,
          fontWeight: 700,
          '&.Mui-selected': { color: 'inherit', bgcolor: 'rgba(255,255,255,0.2)' },
        },
      }}
    >
      <ToggleButton value="en">EN</ToggleButton>
      <ToggleButton value="fr">FR</ToggleButton>
    </ToggleButtonGroup>
  );
}
