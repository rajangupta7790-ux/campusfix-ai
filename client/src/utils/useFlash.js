import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function useFlash() {
  const location = useLocation();
  const navigate = useNavigate();
  const [flash] = useState(location.state?.flash ?? '');

  useEffect(() => {
    if (location.state?.flash) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location, navigate]);

  return flash;
}