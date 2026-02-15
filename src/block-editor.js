import {
	PanelRow,
	TextControl,
	RadioControl,
	CheckboxControl,
	createSlotFill,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState, useRef } from '@wordpress/element';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { PluginPostStatusInfo } from '@wordpress/edit-post';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const panelTitle = window?.pltOptions?.panelTitle ?? 'Page Links To';

// For WordPress 5.2.
const BackCompatPlacement = ({ children = null, ...props }) => (
	<PluginPostStatusInfo {...props}>
		<div
			style={{
				display: 'flex',
				'flex-direction': 'column',
			}}
		>
			<PanelRow>
				<h2 style={{ 'margin-bottom': 0, color: '#191e23' }}>{panelTitle}</h2>
			</PanelRow>
			{children}
		</div>
	</PluginPostStatusInfo>
);

const Placement = PluginDocumentSettingPanel || BackCompatPlacement;

const { Slot } = createSlotFill('PageLinksToSidebar');

const PointsTo = ({ enabled, onToggle }) => {
	const [option, setOption] = useState(enabled ? 'custom' : 'wordpress');

	return (
		<RadioControl
			label={__('Point this content to:', 'page-links-to')}
			selected={option}
			options={[
				{
					label: __('Its normal WordPress URL', 'page-links-to'),
					value: 'wordpress',
				},
				{ label: __('A custom URL', 'page-links-to'), value: 'custom' },
			]}
			onChange={(newOption) => {
				setOption(newOption);
				onToggle(newOption === 'custom');
			}}
		/>
	);
};

const LinksTo = () => {
	const { url, newTab } = useSelect((select) => {
		const getMeta = (attr) =>
			(select('core/editor').getEditedPostAttribute('meta') || [])[attr];
		return {
			url: getMeta('_links_to'),
			newTab: getMeta('_links_to_target') === '_blank',
		};
	}, []);

	const { editPost } = useDispatch('core/editor');

	const onUpdateLink = (link) => {
		editPost({ meta: { _links_to: link } });
	};

	const onUpdateNewTab = (enabled) => {
		editPost({ meta: { _links_to_target: enabled ? '_blank' : '' } });
	};

	const currentUrl = url || '';
	const hasUrl = currentUrl.length > 0;

	const [enabled, setEnabled] = useState(hasUrl);
	const prevUrlRef = useRef('');
	const prevNewTabRef = useRef(false);

	const displayUrl = currentUrl || prevUrlRef.current;

	const toggleStatus = (newValue) => {
		if (!newValue && enabled) {
			// Hold on to the previous state, in case they change their mind.
			prevUrlRef.current = currentUrl;
			prevNewTabRef.current = newTab;
		}

		setEnabled(newValue);

		if (newValue) {
			// Restore the previous states of the url and new tab checkbox.
			onUpdateLink(prevUrlRef.current);
			onUpdateNewTab(prevNewTabRef.current);
		} else {
			onUpdateLink(null);
			onUpdateNewTab(false);
		}
	};

	return (
		<Placement
			title={panelTitle}
			name="PageLinksTo"
			icon={enabled ? 'admin-links' : 'disabled'}
			className="plt-panel"
		>
			<PanelRow>
				<PointsTo enabled={enabled} onToggle={toggleStatus} />
			</PanelRow>

			{enabled && (
				<>
					<PanelRow>
						<TextControl
							label={__('Links to', 'page-links-to')}
							data-testid="plt-url"
							value={displayUrl}
							onChange={onUpdateLink}
							placeholder="https://"
						/>
					</PanelRow>
					{window.pltOptions.supports.newTab && (
						<PanelRow>
							<CheckboxControl
								label={__('Open in new tab', 'page-links-to')}
								data-testid="plt-newtab"
								checked={newTab}
								onChange={onUpdateNewTab}
							/>
						</PanelRow>
					)}
					<Slot />
				</>
			)}
		</Placement>
	);
};

registerPlugin('page-links-to', {
	render: LinksTo,
});
