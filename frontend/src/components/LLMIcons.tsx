import React from 'react';

// Common props for standardizing SVG size and styling
interface IconProps extends React.SVGProps<SVGSVGElement> {
    size?: number | string;
}

export const OpenAIIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
    // Sourced from standard OpenAI branding SVG outline
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...props}
    >
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A6.0651 6.0651 0 0 0 19.0205 19.82a5.9847 5.9847 0 0 0 3.9964-2.9 6.0462 6.0462 0 0 0-.735-7.0988zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.8956zm16.0993 3.8558L12.596 8.3829v-2.3324a.0757.0757 0 0 1 .0332-.0615l4.83-2.7865a4.4992 4.4992 0 0 1 6.1408 1.6464 4.4708 4.4708 0 0 1 .5346 3.0137l-.1416-.0852-4.7834-2.7581a.7712.7712 0 0 0-.7801 0zM8.8784 1.583a4.4755 4.4755 0 0 1 2.8764 1.0408l-.1416.0804-4.7788 2.7582a.7948.7948 0 0 0-.3927.6813v6.7369l-2.02-1.1686a.071.071 0 0 1-.038-.052V6.0772A4.504 4.504 0 0 1 8.8784 1.583zm12.7806 8.5283a4.485 4.485 0 0 1-2.3655 1.9728v-5.6766a.7664.7664 0 0 0-.3879-.6765L13.091 2.3768l2.0201-1.1685a.0757.0757 0 0 1 .071 0l4.8303 2.7866a4.504 4.504 0 0 1 1.6465 6.1164zM11.9961 14.1206l-3.2384-1.87v-3.7402l3.2384-1.87 3.2384 1.87v3.741l-3.2384 1.8692z" />
    </svg>
);

export const GeminiIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
    // Sourced from standard Gemini star SVG outline
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...props}
    >
        <path d="M12.0001 0.709961C12.0001 6.84883 17.1513 12 23.2901 12C17.1513 12 12.0001 17.1512 12.0001 23.29C12.0001 17.1512 6.84897 12 0.709961 12C6.84897 12 12.0001 6.84883 12.0001 0.709961Z" />
    </svg>
);

export const XAIIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
    // The 'X' logo
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...props}
    >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
);
export const ClaudeIcon: React.FC<IconProps> = ({ size = 24, className = '', ...props }) => (
    // Anthropic / Claude brand mark
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        {...props}
    >
        <path d="M17.3 3.9L13.4 14.5l5.9 5.6H19l-3.7-3.5 3.4-9.4-1.4-3.3zM6.7 3.9L3.3 7.2l3.4 9.4-3.7 3.5h.7l5.9-5.6L5.7 4.1l1-.2zm5.6 1.2l-3.8 10.4 3.8 3.6 3.8-3.6-3.8-10.4z" />
    </svg>
);
