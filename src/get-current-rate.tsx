import { Action, ActionPanel, LaunchProps, getPreferenceValues, openExtensionPreferences } from "@raycast/api";

import { Detail } from "@raycast/api";
import { useWiseQuoteQuery } from "./hooks";
import { formatCurrency } from "./utils";
import { FeeBreakdown } from "./components";

interface Arguments {
  amount?: string;
  targetCurrency?: string;
}

interface Preferences {
  defaultAmount: string;
  defaultTargetCurrency: string;
}

export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const preferences = getPreferenceValues<Preferences>();

  const getSourceAmount = () => {
    if (props?.arguments?.amount && !isNaN(parseFloat(props?.arguments?.amount))) {
      return parseFloat(props?.arguments?.amount);
    }
    if (preferences?.defaultAmount && !isNaN(parseFloat(preferences?.defaultAmount))) {
      return parseFloat(preferences?.defaultAmount);
    }
    return 1;
  };

  const getTargetCurrency = () => {
    if (props.arguments?.targetCurrency) {
      return props.arguments.targetCurrency;
    }

    return preferences?.defaultTargetCurrency;
  };

  const sourceAmount = getSourceAmount();
  const targetCurrency = getTargetCurrency();
  const { isLoading, data, error } = useWiseQuoteQuery({
    sourceAmount,
    targetCurrency,
  });

  if (error) {
    const errorMarkdown = `
# Error
${error.message}

Please check:
- If the currency "${targetCurrency}" is correct and supported by Wise
- If the amount "${sourceAmount}" is correct
`;
    return <Detail isLoading={false} navigationTitle="Error" markdown={errorMarkdown} />;
  }

  const availablePaymentOptions = data?.paymentOptions.filter((option) => !option.disabled);
  const preferredPaymentOption = availablePaymentOptions?.[0];

  if (!data) {
    return <Detail isLoading={true} />;
  }

  const markdown = `
# Wise Transfer
You send exaclty **${formatCurrency(data.sourceAmount, data.sourceCurrency)}**

Recepient gets **${formatCurrency(
    preferredPaymentOption?.targetAmount ?? 0,
    preferredPaymentOption?.targetCurrency ?? ""
  )}**

## Rate  
${data.rate}
  `;

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel title="Actions">
          <Action.OpenInBrowser title="Start Transfer in Browser" url="https://wise.com/send#/enterpayment" />
          <Action.CopyToClipboard
            title="Copy Amount to Clipboard"
            content={`${preferredPaymentOption?.targetAmount}`}
          />
          <Action title="Set Default Amount and Target Currency" onAction={openExtensionPreferences} />
        </ActionPanel>
      }
      metadata={<FeeBreakdown paymentOption={preferredPaymentOption} rate={data.rate} />}
    />
  );
}