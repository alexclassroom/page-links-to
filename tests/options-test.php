<?php

class CWS_PLT_Test_Default_Options extends CWS_PLT_TestCase {
	public function test_schema_option(): void {
		$this->assertEquals( 3, get_option( CWS_PageLinksTo::VERSION_KEY ) );
	}
}
