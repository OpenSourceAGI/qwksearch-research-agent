import isVpnModule from 'is-vpn';

interface IpGeolocationData {
  city?: string;
  isVpn: boolean;
}

const isVpn = isVpnModule as any;

export async function detectVpnAndLocation(
  ipAddress: string | null | undefined
): Promise<IpGeolocationData> {
  if (!ipAddress) {
    return { city: undefined, isVpn: false };
  }

  try {
    const [vpnCheck, locationData] = await Promise.all([
      isVpn.check(ipAddress).catch(() => false),
      fetch(`https://ipapi.co/${ipAddress}/json/`)
        .then((res) => res.json())
        .catch(() => ({ city: undefined })),
    ]);

    return {
      city: locationData?.city || undefined,
      isVpn: vpnCheck === true,
    };
  } catch (error) {
    console.error('Failed to detect VPN/location:', error);
    return { city: undefined, isVpn: false };
  }
}
