import React from 'react';
import type { IconProps, WeatherCondition } from '../types';
import {
  CloudBoltIcon,
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudHailIcon,
  CloudShowersHeavyIcon,
  CloudShowersIcon,
  CloudSleetIcon,
  CloudSnowIcon,
  CloudSunIcon,
  CloudsIcon,
  SnowflakeIcon,
  SunIcon,
} from './weather-icons';

const iconMap: Record<WeatherCondition, React.ComponentType<IconProps>> = {
  sun: SunIcon,
  'cloud-sun': CloudSunIcon,
  clouds: CloudsIcon,
  'cloud-fog': CloudFogIcon,
  'cloud-drizzle': CloudDrizzleIcon,
  'cloud-showers': CloudShowersIcon,
  'cloud-showers-heavy': CloudShowersHeavyIcon,
  'cloud-sleet': CloudSleetIcon,
  'cloud-snow': CloudSnowIcon,
  snowflake: SnowflakeIcon,
  'cloud-bolt': CloudBoltIcon,
  'cloud-hail': CloudHailIcon,
};

export function WeatherIcon({ condition, ...props }: IconProps & { condition: WeatherCondition }) {
  const Icon = iconMap[condition] || CloudsIcon;
  return <Icon {...props} />;
}
